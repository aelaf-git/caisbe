from __future__ import annotations

import json
import random
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request, status
from starlette.datastructures import UploadFile
from sqlalchemy.orm import Session, joinedload, selectinload

from app.config import settings
from app.db import get_db
from app.security.auth import get_current_user
from app.security.html_sanitize import sanitize_html, strip_plain_text
from app.security.limiter import limiter
from app.models import (
    Certificate,
    CertificateTemplate,
    Chapter,
    ContentBlock,
    Course,
    Enrollment,
    ExamIntegrityEvent,
    ExamSession,
    FinalExam,
    Lesson,
    AssignmentSubmission,
    BlockCompletion,
    LessonProgress,
    MembershipApplication,
    MembershipCertificate,
    Quiz,
    QuizAttempt,
    QuizQuestion,
    User,
    UserDocument,
)
from app.schemas.auth import MembershipApplicationIn, MembershipApplicationOut
from app.schemas.courses import (
    AssignmentSubmitIn,
    StudentAssignmentDetailOut,
    StudentAssignmentOut,
    CertificateOut,
    UploadOut,
    CertificateVerifyOut,
    CourseDetailStudentOut,
    CourseOut,
    EnrollmentOut,
    ExamIntegrityBatchIn,
    ExamIntegrityEventOut,
    ExamIntegrityStateOut,
    ExamOrderOut,
    ExamPrecheckIn,
    ExamPrecheckOut,
    ExamSessionOut,
    MembershipCertificateOut,
    QuizAnswerReview,
    QuizAttemptOut,
    QuizQuestionStudentOut,
    QuizSubmitIn,
    UserDocumentOut,
)
from app.services.membership import (
    activate_membership,
    issue_membership_certificate,
    membership_certificate_copy,
    membership_is_expired,
    record_membership_application,
)
from app.services.settings import get_setting

from app.services.assignments import (
    append_attempt,
    assignment_blocks_for_courses,
    assignment_unlock_map,
    can_resubmit,
    can_submit_new,
    can_withdraw,
    clear_grade,
    due_has_passed,
    grade_is_visible,
    latest_submitted_at,
    status_bucket,
    submission_is_late,
    submission_map,
)
from app.services.commerce import (
    ACTIVE_ENROLLMENT,
    apply_profile_fields,
    normalize_membership_type,
    require_active_enrollment,
)

from app.routers.courses.router import router
from app.routers.courses.support import *  # noqa: F403

@router.get("/me/courses/{course_id}/final-exam/session", response_model=ExamSessionOut)
def get_final_exam_session(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ExamSessionOut:
    course = _load_published_course(db, course_id)
    exam = _require_open_exam(db, current_user, course)
    state = _exam_session_state(db, current_user, exam, datetime.now(timezone.utc))
    db.commit()
    return state


@router.post("/me/courses/{course_id}/final-exam/precheck", response_model=ExamPrecheckOut)
def precheck_final_exam(
    course_id: int,
    payload: ExamPrecheckIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ExamPrecheckOut:
    course = _load_published_course(db, course_id)
    exam = _require_open_exam(db, current_user, course)
    now = datetime.now(timezone.utc)
    session = _ensure_pending_session(db, current_user, exam)

    if not exam.secure_mode:
        session.secure_ok_at = now
        _record_integrity_event(
            db,
            user=current_user,
            exam=exam,
            session=session,
            phase="pre",
            event_type="precheck_skipped_insecure",
            detail=None,
        )
        db.commit()
        return ExamPrecheckOut(allowed=True, reasons=[], secure_ok=True)

    reasons: list[str] = []
    if not payload.rules_accepted:
        reasons.append("Accept the exam rules to continue.")
    if not payload.fullscreen_ok:
        reasons.append("Enter fullscreen before starting.")
    if not payload.visibility_api_ok:
        reasons.append("Your browser must support focus/visibility monitoring.")
    if not payload.camera_ok:
        reasons.append("Allow camera access for the identity check.")
    if payload.multi_monitor:
        reasons.append("Disconnect extra monitors before starting.")

    detail = {
        "rules_accepted": payload.rules_accepted,
        "fullscreen_ok": payload.fullscreen_ok,
        "visibility_api_ok": payload.visibility_api_ok,
        "camera_ok": payload.camera_ok,
        "multi_monitor": payload.multi_monitor,
        "user_agent": (payload.user_agent or "")[:512],
    }
    _record_integrity_event(
        db,
        user=current_user,
        exam=exam,
        session=session,
        phase="pre",
        event_type="precheck_attempt",
        detail=detail,
    )
    if payload.multi_monitor:
        _record_integrity_event(
            db,
            user=current_user,
            exam=exam,
            session=session,
            phase="pre",
            event_type="multi_monitor_detected",
            detail={"multi_monitor": True},
        )

    if reasons:
        session.secure_ok_at = None
        _record_integrity_event(
            db,
            user=current_user,
            exam=exam,
            session=session,
            phase="pre",
            event_type="precheck_failed",
            detail={"reasons": reasons},
        )
        db.commit()
        return ExamPrecheckOut(allowed=False, reasons=reasons, secure_ok=False)

    session.secure_ok_at = now
    if session.locked_out_at is not None:
        # Fresh precheck after a prior lockout only applies once the session was cleared on submit.
        pass
    _record_integrity_event(
        db,
        user=current_user,
        exam=exam,
        session=session,
        phase="pre",
        event_type="precheck_ok",
        detail=detail,
    )
    db.commit()
    return ExamPrecheckOut(allowed=True, reasons=[], secure_ok=True)


@router.post("/me/courses/{course_id}/final-exam/integrity", response_model=ExamIntegrityStateOut)
def report_final_exam_integrity(
    course_id: int,
    payload: ExamIntegrityBatchIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ExamIntegrityStateOut:
    course = _load_published_course(db, course_id)
    exam = _require_open_exam(db, current_user, course)
    now = datetime.now(timezone.utc)
    session = _exam_session(db, current_user, exam)
    if session is None or session.started_at is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Exam is not in progress.")

    newly_locked = False
    for item in payload.events:
        event_type = (item.event_type or "").strip()[:64]
        if not event_type:
            continue
        _record_integrity_event(
            db,
            user=current_user,
            exam=exam,
            session=session,
            phase=item.phase,
            event_type=event_type,
            detail=item.detail,
        )
        if _apply_violation(db, exam=exam, session=session, event_type=event_type, now=now):
            newly_locked = True

    if newly_locked:
        _record_integrity_event(
            db,
            user=current_user,
            exam=exam,
            session=session,
            phase="live",
            event_type="lockout",
            detail={"violation_count": session.violation_count},
        )

    db.commit()
    max_v = max(1, int(exam.max_integrity_violations or 3))
    locked = session.locked_out_at is not None
    return ExamIntegrityStateOut(
        violation_count=int(session.violation_count or 0),
        max_integrity_violations=max_v,
        locked_out=locked,
        force_submit=locked,
    )


@router.post("/me/courses/{course_id}/final-exam/start", response_model=ExamSessionOut)
def start_final_exam(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ExamSessionOut:
    course = _load_published_course(db, course_id)
    exam = _require_open_exam(db, current_user, course)
    now = datetime.now(timezone.utc)
    _close_expired_exam_session(db, current_user, exam, now)
    session = _exam_session(db, current_user, exam)

    if session is not None and session.started_at is not None:
        state = _exam_session_state(db, current_user, exam, datetime.now(timezone.utc))
        db.commit()
        return state

    if exam.secure_mode and not _secure_precheck_valid(exam, session, now):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Complete the secure exam pre-check before starting.",
        )

    from app.services.commerce import ensure_attempt_paid

    ensure_attempt_paid(db, current_user, course)

    if session is None:
        session = ExamSession(
            user_id=current_user.id,
            final_exam_id=exam.id,
            started_at=now,
            order_json=json.dumps(_new_exam_order(exam)),
            violation_count=0,
            secure_ok_at=now if not exam.secure_mode else None,
        )
        db.add(session)
        db.flush()
    else:
        if session.locked_out_at is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This exam attempt was locked for integrity violations. Submit or contact an administrator.",
            )
        session.started_at = now
        session.violation_count = 0
        session.locked_out_at = None
        if not session.order_json:
            session.order_json = json.dumps(_new_exam_order(exam))
        db.flush()

    _record_integrity_event(
        db,
        user=current_user,
        exam=exam,
        session=session,
        phase="live",
        event_type="exam_started",
        detail={"secure_mode": bool(exam.secure_mode)},
    )
    state = _exam_session_state(db, current_user, exam, datetime.now(timezone.utc))
    db.commit()
    return state


@router.post("/me/courses/{course_id}/final-exam/submit", response_model=QuizAttemptOut)
@limiter.limit("20/minute")
def submit_final_exam(
    request: Request,
    course_id: int,
    payload: QuizSubmitIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> QuizAttemptOut:
    course = _load_published_course(db, course_id)
    exam = _require_open_exam(db, current_user, course)
    now = datetime.now(timezone.utc)
    session = (
        db.query(ExamSession)
        .filter(ExamSession.user_id == current_user.id, ExamSession.final_exam_id == exam.id)
        .with_for_update()
        .first()
    )
    if session is None or session.started_at is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Start the exam before submitting.")

    violations = int(session.violation_count or 0)
    locked_out = session.locked_out_at is not None
    timed_out = _session_expired(exam, session, now)
    if timed_out or locked_out:
        score = 0
        passed = False
        answers_json = "{}"
        if locked_out:
            _record_integrity_event(
                db,
                user=current_user,
                exam=exam,
                session=session,
                phase="post",
                event_type="submit_locked_out",
                detail={"violation_count": violations},
            )
    else:
        order = _exam_order(session)
        selected = _questions_for_order(exam, order)
        if not selected:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Exam session has no questions.")
        allowed_ids = {str(question.id) for question in selected}
        answers = {key: value for key, value in payload.answers.items() if key in allowed_ids}
        score, _, _ = _score_answers(selected, answers)
        passed = score >= exam.pass_percent
        answers_json = json.dumps(answers)

    attempt = QuizAttempt(
        user_id=current_user.id,
        final_exam_id=exam.id,
        score=score,
        passed=passed,
        answers_json=answers_json,
    )
    db.add(attempt)
    _record_integrity_event(
        db,
        user=current_user,
        exam=exam,
        session=session,
        phase="post",
        event_type="exam_submitted",
        detail={"score": score, "passed": passed, "violation_count": violations, "locked_out": locked_out},
    )
    # Keep integrity history; clear session_id link by deleting session after flush.
    session_id = session.id
    db.flush()
    db.query(ExamIntegrityEvent).filter(ExamIntegrityEvent.exam_session_id == session_id).update(
        {ExamIntegrityEvent.exam_session_id: None},
        synchronize_session=False,
    )
    db.delete(session)

    certificate_code = None
    if passed:
        enrollment = require_active_enrollment(db, current_user, course_id)
        db.flush()
        certificate_code = _finalize_course_completion(db, current_user, course, enrollment)

    db.commit()
    db.refresh(attempt)
    return QuizAttemptOut(
        id=attempt.id,
        score=attempt.score,
        passed=attempt.passed,
        certificate_code=certificate_code,
        reviews=[],
        integrity_violations=violations,
        locked_out=locked_out,
    )



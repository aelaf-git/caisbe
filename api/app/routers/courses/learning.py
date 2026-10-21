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

@router.post("/me/lessons/{lesson_id}/complete", status_code=status.HTTP_200_OK)
def complete_lesson(
    lesson_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, int | bool | str | None]:
    lesson = (
        db.query(Lesson)
        .options(joinedload(Lesson.chapter).joinedload(Chapter.course).joinedload(Course.chapters).joinedload(Chapter.lessons))
        .filter(Lesson.id == lesson_id)
        .first()
    )
    if lesson is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")

    course = lesson.chapter.course
    if course.status != "published":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    enrollment = require_active_enrollment(db, current_user, course.id)
    _require_prior_topics_complete(db, current_user, lesson)

    existing = (
        db.query(LessonProgress)
        .filter(LessonProgress.user_id == current_user.id, LessonProgress.lesson_id == lesson_id)
        .first()
    )
    if existing is None:
        db.add(LessonProgress(user_id=current_user.id, lesson_id=lesson_id))
        db.flush()

    # reload course with chapters for progress
    course = _load_published_course(db, course.id)
    _recompute_progress(db, current_user, course, enrollment)
    maybe_notify_exam_access_request(db, current_user, course, enrollment)

    certificate_code: str | None = None
    if course_completion_requirements_met(db, current_user, course):
        if enrollment.status != "completed":
            certificate_code = _finalize_course_completion(db, current_user, course, enrollment)
        else:
            certificate_code = _issue_certificate(db, current_user, course)

    db.commit()
    return {
        "completed": True,
        "progress": enrollment.progress,
        "certificate_code": certificate_code,
    }


@router.delete("/me/lessons/{lesson_id}/complete", status_code=status.HTTP_200_OK)
def uncomplete_lesson(
    lesson_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, int | bool]:
    """Allow a student to clear the completed mark on a topic."""
    lesson = (
        db.query(Lesson)
        .options(
            joinedload(Lesson.chapter)
            .joinedload(Chapter.course)
            .joinedload(Course.chapters)
            .joinedload(Chapter.lessons)
        )
        .filter(Lesson.id == lesson_id)
        .first()
    )
    if lesson is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")

    course = lesson.chapter.course
    if course.status != "published":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    enrollment = require_active_enrollment(db, current_user, course.id)
    existing = (
        db.query(LessonProgress)
        .filter(LessonProgress.user_id == current_user.id, LessonProgress.lesson_id == lesson_id)
        .first()
    )
    if existing is not None:
        db.delete(existing)
        db.flush()

    course = _load_published_course(db, course.id)
    _recompute_progress(db, current_user, course, enrollment)
    if enrollment.status == "completed" and not course_completion_requirements_met(
        db, current_user, course
    ):
        enrollment.status = "enrolled"

    db.commit()
    return {"completed": False, "progress": enrollment.progress}


@router.post("/me/quizzes/{quiz_id}/submit", response_model=QuizAttemptOut)
def submit_quiz(
    quiz_id: int,
    payload: QuizSubmitIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> QuizAttemptOut:
    quiz = (
        db.query(Quiz)
        .options(joinedload(Quiz.questions).joinedload(QuizQuestion.choices), joinedload(Quiz.blocks))
        .filter(Quiz.id == quiz_id)
        .first()
    )
    if quiz is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")

    block = next((item for item in quiz.blocks if item.lesson_id or item.chapter_id), None)
    if block is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quiz is not attached to a course")

    if block.lesson_id is not None:
        lesson = db.query(Lesson).options(joinedload(Lesson.chapter)).filter(Lesson.id == block.lesson_id).first()
        if lesson is None or lesson.chapter is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")
        course_id = lesson.chapter.course_id
    else:
        chapter = db.query(Chapter).filter(Chapter.id == block.chapter_id).first()
        if chapter is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chapter not found")
        course_id = chapter.course_id
    course = db.query(Course).filter(Course.id == course_id).first()
    if course is None or course.status != "published":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    require_active_enrollment(db, current_user, course_id)

    passed_existing = (
        db.query(QuizAttempt)
        .filter(
            QuizAttempt.user_id == current_user.id,
            QuizAttempt.quiz_id == quiz.id,
            QuizAttempt.passed.is_(True),
        )
        .order_by(QuizAttempt.id.desc())
        .first()
    )
    if passed_existing is not None:
        stored = json.loads(passed_existing.answers_json or "{}")
        if not isinstance(stored, dict):
            stored = {}
        checked: dict[str, int] = {}
        for key, value in stored.items():
            try:
                checked[str(key)] = int(value)
            except (TypeError, ValueError):
                continue
        _apply_progress(db, current_user, course_id)
        db.commit()
        return QuizAttemptOut(
            id=passed_existing.id,
            score=passed_existing.score,
            passed=True,
            certificate_code=None,
            reviews=_answer_reviews(quiz.questions, checked),
        )

    score, _, _ = _score_answers(quiz.questions, payload.answers)
    pass_mark = max(0, min(100, int(course.pass_percent or 70)))
    passed = score >= pass_mark
    attempt = QuizAttempt(
        user_id=current_user.id,
        quiz_id=quiz.id,
        score=score,
        passed=passed,
        answers_json=json.dumps(payload.answers),
    )
    db.add(attempt)
    db.flush()
    _apply_progress(db, current_user, course_id)
    db.commit()
    db.refresh(attempt)
    return QuizAttemptOut(
        id=attempt.id,
        score=attempt.score,
        passed=attempt.passed,
        certificate_code=None,
        reviews=_answer_reviews(quiz.questions, payload.answers),
    )


@router.get("/me/quizzes/{quiz_id}/latest", response_model=QuizAttemptOut)
def latest_quiz_attempt(
    quiz_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> QuizAttemptOut:
    quiz = (
        db.query(Quiz)
        .options(joinedload(Quiz.questions).joinedload(QuizQuestion.choices), joinedload(Quiz.blocks))
        .filter(Quiz.id == quiz_id)
        .first()
    )
    if quiz is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")

    block = next((item for item in quiz.blocks if item.lesson_id or item.chapter_id), None)
    if block is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quiz is not attached to a course")
    if block.lesson_id is not None:
        lesson = db.query(Lesson).options(joinedload(Lesson.chapter)).filter(Lesson.id == block.lesson_id).first()
        if lesson is None or lesson.chapter is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")
        course_id = lesson.chapter.course_id
    else:
        chapter = db.query(Chapter).filter(Chapter.id == block.chapter_id).first()
        if chapter is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chapter not found")
        course_id = chapter.course_id
    require_active_enrollment(db, current_user, course_id)

    attempt = (
        db.query(QuizAttempt)
        .filter(QuizAttempt.user_id == current_user.id, QuizAttempt.quiz_id == quiz.id)
        .order_by(QuizAttempt.id.desc())
        .first()
    )
    if attempt is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No quiz attempt yet.")
    stored = json.loads(attempt.answers_json or "{}")
    if not isinstance(stored, dict):
        stored = {}
    checked: dict[str, int] = {}
    for key, value in stored.items():
        try:
            checked[str(key)] = int(value)
        except (TypeError, ValueError):
            continue
    return QuizAttemptOut(
        id=attempt.id,
        score=attempt.score,
        passed=attempt.passed,
        certificate_code=None,
        reviews=_answer_reviews(quiz.questions, checked),
    )


@router.post("/me/uploads", response_model=UploadOut)
async def student_upload(
    request: Request,
    current_user: User = Depends(get_current_user),
) -> UploadOut:
    from app.services.storage import save_upload

    if current_user.role == "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Use the admin upload.")
    form = await request.form(max_part_size=_STUDENT_UPLOAD_MAX_BYTES)
    uploaded = form.get("file")
    if not isinstance(uploaded, UploadFile):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing file upload")
    url, filename = await save_upload(
        uploaded,
        allowed_suffixes=_STUDENT_UPLOAD_SUFFIXES,
        max_bytes=_STUDENT_UPLOAD_MAX_BYTES,
        folder="assignments",
        invalid_detail="Upload a PDF, Word, or image file (JPG, PNG, WebP, GIF).",
        too_large_detail="File is too large. Maximum size is 25 MB.",
    )
    return UploadOut(url=url, filename=filename)


@router.get("/me/assignments", response_model=list[StudentAssignmentOut])
def list_my_assignments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[StudentAssignmentOut]:
    course_ids = [
        row[0]
        for row in db.query(Enrollment.course_id)
        .filter(
            Enrollment.user_id == current_user.id,
            Enrollment.status.in_(ACTIVE_ENROLLMENT),
        )
        .all()
    ]
    blocks = assignment_blocks_for_courses(db, course_ids)
    rows = submission_map(db, current_user.id, [block.id for block in blocks])
    unlocks = assignment_unlock_map(db, current_user.id, blocks)
    if db.new or db.dirty:
        db.commit()
    items: list[StudentAssignmentOut] = []
    for block in blocks:
        chapter = block.chapter
        course = chapter.course if chapter else None
        if course is None:
            continue
        row = rows.get(block.id)
        submitted_at = latest_submitted_at(row) if row else None
        visible = grade_is_visible(row.status) if row else False
        items.append(
            StudentAssignmentOut(
                block_id=block.id,
                course_id=course.id,
                title=block.title or "Assignment",
                course_code=course.code,
                course_title=course.title,
                chapter_title=chapter.title if chapter else "",
                due_at=block.due_at,
                bucket=status_bucket(row.status if row else None),
                review_status=row.status if row else None,
                score=row.score if row and visible else None,
                points_possible=block.points_possible,
                submitted_at=submitted_at,
                is_late=submission_is_late(block.due_at, submitted_at),
                unlocked=unlocks.get(block.id, False),
            )
        )
    items.sort(
        key=lambda item: (
            item.due_at is None,
            item.due_at.timestamp() if item.due_at is not None else 0,
            item.title.lower(),
        )
    )
    return items


@router.get("/me/assignments/{block_id}", response_model=StudentAssignmentDetailOut)
def get_my_assignment(
    block_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> StudentAssignmentDetailOut:
    block, course = _load_student_assignment(db, block_id)
    require_active_enrollment(db, current_user, course.id)
    rows = submission_map(db, current_user.id, [block.id])
    unlocked = assignment_unlock_map(db, current_user.id, [block]).get(block.id, False)
    if db.new or db.dirty:
        db.commit()
    return _student_assignment_detail(block, rows.get(block.id), unlocked=unlocked)


@router.post("/me/blocks/{block_id}/submit")
def submit_assignment(
    block_id: int,
    payload: AssignmentSubmitIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, int | str | bool]:
    block, course = _load_student_assignment(db, block_id)
    require_active_enrollment(db, current_user, course.id)
    existing = (
        db.query(AssignmentSubmission)
        .filter(
            AssignmentSubmission.user_id == current_user.id,
            AssignmentSubmission.content_block_id == block.id,
        )
        .first()
    )
    if not assignment_unlock_map(db, current_user.id, [block]).get(block.id, False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Complete this chapter's topics before submitting this assignment.",
        )
    if existing is not None and existing.status == "passed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This assignment has been marked passed and can no longer be changed.",
        )
    if existing is None and not can_submit_new(block.due_at):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The due date for this assignment has passed.",
        )
    if existing is not None and not can_resubmit(existing.status, block.due_at):
        if due_has_passed(block.due_at):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The due date for this assignment has passed.",
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This assignment cannot be resubmitted.",
        )
    text, file_url, file_name = _submission_payload(payload)
    now = datetime.now(timezone.utc)
    if existing is None:
        existing = AssignmentSubmission(
            user_id=current_user.id,
            content_block_id=block.id,
            status="under_review",
            created_at=now,
            updated_at=now,
        )
        db.add(existing)
    else:
        clear_grade(existing)
    existing.body = text
    existing.file_url = file_url
    existing.file_name = file_name
    existing.updated_at = now
    db.flush()
    append_attempt(
        db,
        existing,
        body=text,
        file_url=file_url,
        file_name=file_name,
        submitted_at=now,
    )
    enrollment = _apply_progress(db, current_user, course.id)
    db.commit()
    return {"completed": True, "status": "under_review", "progress": enrollment.progress}


@router.delete("/me/blocks/{block_id}/submit")
def unsubmit_assignment(
    block_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, int | bool]:
    block, course = _load_student_assignment(db, block_id)
    require_active_enrollment(db, current_user, course.id)
    existing = (
        db.query(AssignmentSubmission)
        .filter(
            AssignmentSubmission.user_id == current_user.id,
            AssignmentSubmission.content_block_id == block.id,
        )
        .first()
    )
    legacy = (
        db.query(BlockCompletion)
        .filter(BlockCompletion.user_id == current_user.id, BlockCompletion.content_block_id == block.id)
        .first()
    )
    if existing is None and legacy is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No submission to withdraw.")
    if existing is not None:
        if existing.status != "under_review":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This assignment has already been reviewed.",
            )
        db.delete(existing)
    if legacy is not None:
        db.delete(legacy)
    db.flush()
    enrollment = _apply_progress(db, current_user, course.id)
    db.commit()
    return {"completed": False, "progress": enrollment.progress}



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

@router.get("/courses", response_model=list[CourseOut])
def list_courses(db: Session = Depends(get_db)) -> list[Course]:
    return (
        db.query(Course)
        .filter(Course.status == "published")
        .order_by(Course.code)
        .all()
    )


@router.get("/courses/{course_id}", response_model=CourseDetailStudentOut)
def get_course_detail(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CourseDetailStudentOut:
    course = _load_published_course(db, course_id)
    enrollment = require_active_enrollment(db, current_user, course_id)

    completed_ids = {
        row.lesson_id
        for row in db.query(LessonProgress)
        .filter(LessonProgress.user_id == current_user.id)
        .all()
    }
    cert = (
        db.query(Certificate)
        .filter(Certificate.user_id == current_user.id, Certificate.course_id == course_id)
        .first()
    )
    exam_passed = False
    exam_score = None
    if course.final_exam:
        attempt = (
            db.query(QuizAttempt)
            .filter(
                QuizAttempt.user_id == current_user.id,
                QuizAttempt.final_exam_id == course.final_exam.id,
                QuizAttempt.passed.is_(True),
            )
            .order_by(QuizAttempt.created_at.desc(), QuizAttempt.id.desc())
            .first()
        )
        exam_passed = attempt is not None
        exam_score = attempt.score if attempt else None

    detail = CourseDetailStudentOut.model_validate(course)
    detail.enrolled = True
    detail.progress = enrollment.progress
    detail.certificate_code = cert.certificate_code if cert else None
    detail.exam_passed = exam_passed
    detail.exam_score = exam_score
    if detail.final_exam is not None and course.final_exam is not None:
        detail.final_exam.question_bank_size = len(course.final_exam.questions)
        # Withhold the bank until an attempt starts (session returns the subset).
        detail.final_exam.questions = []

    _, quiz_ids, assignment_ids = _course_progress_units(db, course_id)
    done_quizzes = set()
    if quiz_ids:
        done_quizzes = {
            row[0]
            for row in db.query(QuizAttempt.quiz_id)
            .filter(QuizAttempt.user_id == current_user.id, QuizAttempt.quiz_id.in_(quiz_ids))
            .distinct()
            .all()
        }
    submissions = submission_map(db, current_user.id, assignment_ids)
    assignment_blocks = [
        block
        for chapter in course.chapters
        for block in chapter.blocks
        if block.block_type == "assignment"
    ]
    unlocks = assignment_unlock_map(db, current_user.id, assignment_blocks)
    if db.new or db.dirty:
        db.commit()

    for chapter in detail.chapters:
        for lesson in chapter.lessons:
            lesson.completed = lesson.id in completed_ids
        for block in chapter.blocks:
            if block.block_type == "quiz":
                block.completed = block.quiz is not None and block.quiz.id in done_quizzes
            elif block.block_type == "assignment":
                row = submissions.get(block.id)
                block.completed = row is not None
                block.review_status = row.status if row else None
                submitted_at = latest_submitted_at(row) if row else None
                visible = grade_is_visible(row.status) if row else False
                block.submission_score = row.score if row and visible else None
                block.submission_feedback = row.feedback if row and visible else None
                block.submission_file_url = row.file_url if row else None
                block.submission_file_name = row.file_name if row else None
                block.submission_body = row.body if row else None
                block.submitted_at = submitted_at
                unlocked = unlocks.get(block.id, False)
                block.can_submit = unlocked and row is None and can_submit_new(block.due_at)
                block.can_resubmit = unlocked and can_resubmit(row.status, block.due_at) if row else False
                block.is_late = submission_is_late(block.due_at, submitted_at)

    return detail


@router.get("/me/enrollments", response_model=list[EnrollmentOut])
def list_my_enrollments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[EnrollmentOut]:
    rows = (
        db.query(Enrollment)
        .options(joinedload(Enrollment.course).joinedload(Course.final_exam))
        .filter(Enrollment.user_id == current_user.id)
        .order_by(Enrollment.enrolled_at.desc())
        .all()
    )
    items = [_enrollment_to_out(db, current_user, row) for row in rows]
    if db.new or db.dirty:
        db.commit()
    return items


@router.post("/me/enrollments", status_code=status.HTTP_400_BAD_REQUEST)
def enroll_in_course() -> None:
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Complete checkout to enroll. Use POST /me/checkout.",
    )



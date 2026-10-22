from __future__ import annotations

import json
import random
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from starlette.datastructures import UploadFile
from sqlalchemy.orm import Session, joinedload, selectinload

from app.config import settings
from app.db import get_db
from app.security.auth import get_current_user
from app.security.html_sanitize import sanitize_html, strip_plain_text
from app.security.limiter import limiter
from app.services.translations import localize_many
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
  LessonStudentOut,
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
    direct_assignments_for_user,
    direct_submission_map,
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

def _public_course_teaser(description: str | None, max_chars: int = 260) -> str:
    plain = " ".join((strip_plain_text(description) or "").split())
    if len(plain) <= max_chars:
        return plain
    cut = plain[:max_chars].rsplit(" ", 1)[0].rstrip(".,;:")
    return f"{cut}…"


@router.get("/courses", response_model=list[CourseOut])
@limiter.limit("30/minute")
def list_courses(
    request: Request,
    lang: str = Query(default="en", max_length=12),
    db: Session = Depends(get_db),
) -> list[CourseOut]:
    rows = (
        db.query(Course)
        .filter(Course.status == "published")
        .order_by(Course.code)
        .all()
    )
    items: list[CourseOut] = []
    for row in rows:
        item = CourseOut.model_validate(row)
        items.append(item)
    items = localize_many(db, "course", items, lang)
    for item in items:
        item.description = _public_course_teaser(item.description)
    return items


@router.get("/courses/{course_id}", response_model=CourseDetailStudentOut)
@limiter.limit("30/minute")
def get_course_detail(
    request: Request,
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
    done_quizzes = _passed_quiz_ids(db, current_user.id, quiz_ids)
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

    prior_topics_complete = True
    course_fully_unlocked = enrollment.status == "completed" or exam_passed or cert is not None

    for chapter in detail.chapters:
        for lesson in chapter.lessons:
            lesson.completed = lesson.id in completed_ids
            topic_unlocked = course_fully_unlocked or prior_topics_complete or lesson.completed
            if not topic_unlocked:
                lesson.body = ""
                for block in lesson.blocks:
                    block.body = None
                    block.url = None
                    block.quiz = None
            if not lesson.completed:
                prior_topics_complete = False
        for block in chapter.blocks:
            if block.block_type == "quiz":
                block.completed = block.quiz is not None and block.quiz.id in done_quizzes
            elif block.block_type == "assignment":
                row = submissions.get(block.id)
                block.completed = bool(row and row.status == "passed")
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

    directs = direct_assignments_for_user(db, current_user.id, course_id=course_id)
    direct_rows = direct_submission_map(db, current_user.id, [item.id for item in directs])
    detail.direct_assignments = []
    for assignment in directs:
        row = direct_rows.get(assignment.id)
        submitted_at = latest_submitted_at(row) if row else None
        visible = grade_is_visible(row.status) if row else False
        detail.direct_assignments.append(
            StudentAssignmentOut(
                kind="direct",
                block_id=0,
                direct_assignment_id=assignment.id,
                course_id=course.id,
                title=assignment.title,
                course_code=course.code,
                course_title=course.title,
                chapter_title="Assigned to you",
                due_at=assignment.due_at,
                bucket=status_bucket(row.status if row else None),
                review_status=row.status if row else None,
                score=row.score if row and visible else None,
                points_possible=assignment.points_possible,
                submitted_at=submitted_at,
                is_late=submission_is_late(assignment.due_at, submitted_at),
                unlocked=True,
            )
        )

    return detail


@router.get("/courses/{course_id}/lessons/{lesson_id}", response_model=LessonStudentOut)
@limiter.limit("20/minute")
def get_course_lesson_detail(
    request: Request,
    course_id: int,
    lesson_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> LessonStudentOut:
    course = _load_published_course(db, course_id)
    enrollment = require_active_enrollment(db, current_user, course_id)
    target_lesson: Lesson | None = None
    for chapter in course.chapters:
        for lesson in chapter.lessons:
            if lesson.id == lesson_id:
                target_lesson = lesson
                break
        if target_lesson is not None:
            break
    if target_lesson is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")

    if enrollment.status != "completed":
        _require_prior_topics_complete(db, current_user, target_lesson)

    completed = (
        db.query(LessonProgress)
        .filter(LessonProgress.user_id == current_user.id, LessonProgress.lesson_id == lesson_id)
        .first()
        is not None
    )
    out = LessonStudentOut.model_validate(target_lesson)
    out.completed = completed
    return out


@router.get("/me/enrollments", response_model=list[EnrollmentOut])
@limiter.limit("30/minute")
def list_my_enrollments(
    request: Request,
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



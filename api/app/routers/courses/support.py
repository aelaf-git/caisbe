from __future__ import annotations

import json
import logging
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

logger = logging.getLogger(__name__)


def _lesson_ids_for_course(course: Course) -> list[int]:
    ids: list[int] = []
    for chapter in course.chapters:
        for lesson in chapter.lessons:
            ids.append(lesson.id)
    return ids


def _course_progress_units(db: Session, course_id: int) -> tuple[list[int], list[int], list[int]]:
    lesson_ids = [
        row[0]
        for row in (
            db.query(Lesson.id)
            .join(Chapter, Chapter.id == Lesson.chapter_id)
            .filter(Chapter.course_id == course_id)
            .all()
        )
    ]
    quiz_ids = [
        row[0]
        for row in (
            db.query(ContentBlock.quiz_id)
            .join(Chapter, Chapter.id == ContentBlock.chapter_id)
            .filter(
                Chapter.course_id == course_id,
                ContentBlock.block_type == "quiz",
                ContentBlock.quiz_id.isnot(None),
            )
            .all()
        )
    ]
    assignment_ids = [
        row[0]
        for row in (
            db.query(ContentBlock.id)
            .join(Chapter, Chapter.id == ContentBlock.chapter_id)
            .filter(Chapter.course_id == course_id, ContentBlock.block_type == "assignment")
            .all()
        )
    ]
    return lesson_ids, quiz_ids, assignment_ids


def _assignment_review_status(
    db: Session, user_id: int, assignment_ids: list[int]
) -> dict[int, str]:
    return {
        block_id: row.status
        for block_id, row in submission_map(db, user_id, assignment_ids).items()
    }


def _completed_assignment_ids(db: Session, user_id: int, assignment_ids: list[int]) -> set[int]:
    return set(_assignment_review_status(db, user_id, assignment_ids).keys())


def _recompute_progress(db: Session, user: User, course: Course, enrollment: Enrollment) -> None:
    lesson_ids, quiz_ids, assignment_ids = _course_progress_units(db, course.id)
    total = len(lesson_ids) + len(quiz_ids) + len(assignment_ids)
    if total == 0:
        enrollment.progress = 0
        return
    completed = 0
    if lesson_ids:
        completed += (
            db.query(LessonProgress)
            .filter(LessonProgress.user_id == user.id, LessonProgress.lesson_id.in_(lesson_ids))
            .count()
        )
    if quiz_ids:
        completed += (
            db.query(QuizAttempt.quiz_id)
            .filter(QuizAttempt.user_id == user.id, QuizAttempt.quiz_id.in_(quiz_ids))
            .distinct()
            .count()
        )
    completed += len(_completed_assignment_ids(db, user.id, assignment_ids))
    enrollment.progress = int(round(100 * completed / total))


def _course_topics_complete(db: Session, user: User, course: Course) -> bool:
    done = _completed_lesson_ids(db, user, course)
    for chapter in course.chapters:
        for topic in chapter.lessons:
            if topic.id not in done:
                return False
    return True


def course_completion_requirements_met(db: Session, user: User, course: Course) -> bool:
    """Certificate eligibility: all lessons done, plus final exam pass when configured."""
    if not _course_topics_complete(db, user, course):
        return False
    if course.final_exam is not None and not _user_passed_final_exam(db, user, course):
        return False
    return True


def _apply_progress(db: Session, user: User, course_id: int) -> Enrollment:
    course = db.query(Course).filter(Course.id == course_id, Course.status == "published").first()
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    enrollment = require_active_enrollment(db, user, course_id)
    _recompute_progress(db, user, course, enrollment)
    if enrollment.status != "completed":
        course = _load_published_course(db, course_id)
        if course_completion_requirements_met(db, user, course):
            _finalize_course_completion(db, user, course, enrollment)
    return enrollment


def _load_published_course(db: Session, course_id: int) -> Course:
    course = (
        db.query(Course)
        .options(
            selectinload(Course.chapters).selectinload(Chapter.lessons).selectinload(Lesson.blocks).selectinload(ContentBlock.quiz).selectinload(Quiz.questions).selectinload(QuizQuestion.choices),
            selectinload(Course.chapters).selectinload(Chapter.blocks).selectinload(ContentBlock.quiz).selectinload(Quiz.questions).selectinload(QuizQuestion.choices),
            selectinload(Course.final_exam).selectinload(FinalExam.questions).selectinload(QuizQuestion.choices),
            selectinload(Course.certificate_template),
        )
        .filter(Course.id == course_id, Course.status == "published")
        .first()
    )
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    return course


def _score_answers(questions: list[QuizQuestion], answers: dict[str, int]) -> tuple[int, bool, int]:
    if not questions:
        return 0, False, 0
    correct = 0
    for question in questions:
        choice_id = answers.get(str(question.id))
        if choice_id is None:
            continue
        for choice in question.choices:
            if choice.id == choice_id and choice.is_correct:
                correct += 1
                break
    score = int(round(100 * correct / len(questions)))
    return score, False, correct


def _answer_reviews(questions: list[QuizQuestion], answers: dict[str, int]) -> list[QuizAnswerReview]:
    reviews: list[QuizAnswerReview] = []
    for question in questions:
        correct = next((choice for choice in question.choices if choice.is_correct), None)
        if correct is None:
            continue
        reviews.append(
            QuizAnswerReview(
                question_id=question.id,
                selected_choice_id=answers.get(str(question.id)),
                correct_choice_id=correct.id,
            )
        )
    return reviews


def _apply_placeholders(
    text: str,
    *,
    student_name: str,
    course_title: str,
    issued_at: datetime,
) -> str:
    issued_date = issued_at.strftime("%B %d, %Y")
    return (
        text.replace("{student_name}", student_name)
        .replace("{course_title}", course_title)
        .replace("{issued_date}", issued_date)
    )


def certificate_program_name(course: Course) -> str:
    template = course.certificate_template
    custom = (template.program_name or "").strip() if template is not None else ""
    return custom or course.title


def _render_certificate(
    template: CertificateTemplate | None,
    student_name: str,
    course_title: str,
    issued_at: datetime,
) -> dict[str, str]:
    title_template = template.title if template else "Certificate of Completion"
    body_template = (
        template.body
        if template
        else "This certifies that {student_name} has successfully completed {course_title}."
    )
    kwargs = {"student_name": student_name, "course_title": course_title, "issued_at": issued_at}
    return {
        "title": _apply_placeholders(title_template, **kwargs),
        "body": _apply_placeholders(body_template, **kwargs),
    }


def _certificate_verify_url(certificate_code: str) -> str:
    from urllib.parse import quote

    base = (settings.portal_public_url or "http://localhost:3002").rstrip("/")
    if not base.startswith(("http://", "https://")):
        base = f"https://{base.lstrip('/')}"
    code = quote(str(certificate_code).strip(), safe="-._~")
    return f"{base}/certificates/verify/{code}"


def _issue_certificate(db: Session, user: User, course: Course) -> str:
    existing = (
        db.query(Certificate)
        .filter(Certificate.user_id == user.id, Certificate.course_id == course.id)
        .first()
    )
    if existing:
        return existing.certificate_code
    certificate_code = f"CAISBE-{course.code}-{secrets.token_hex(8).upper()}"
    while (
        db.query(Certificate)
        .filter(Certificate.certificate_code == certificate_code)
        .first()
        is not None
    ):
        certificate_code = f"CAISBE-{course.code}-{secrets.token_hex(8).upper()}"
    db.add(
        Certificate(
            user_id=user.id,
            course_id=course.id,
            certificate_code=certificate_code,
        )
    )
    db.flush()
    return certificate_code


def _user_passed_final_exam(db: Session, user: User, course: Course) -> bool:
    exam = course.final_exam
    if exam is None:
        return True
    attempt = (
        db.query(QuizAttempt)
        .filter(
            QuizAttempt.user_id == user.id,
            QuizAttempt.final_exam_id == exam.id,
            QuizAttempt.passed.is_(True),
        )
        .first()
    )
    return attempt is not None


def _finalize_course_completion(
    db: Session,
    user: User,
    course: Course,
    enrollment: Enrollment,
) -> str:
    if not course_completion_requirements_met(db, user, course):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Complete every topic"
            + (" and pass the final exam" if course.final_exam is not None else "")
            + " before earning a certificate.",
        )
    enrollment.status = "completed"
    _recompute_progress(db, user, course, enrollment)
    certificate_code = _issue_certificate(db, user, course)
    issue_membership_certificate(db, user)
    if (user.email or "").strip():
        try:
            from app.services.course_completion_email import send_course_completion_email

            send_course_completion_email(
                to=user.email,
                full_name=user.full_name,
                course_title=course.title,
                certificate_code=certificate_code,
            )
        except Exception:
            logger.exception(
                "Course completion email failed for user %s course %s",
                user.id,
                course.id,
            )
    return certificate_code


def _certificate_to_out(row: Certificate, student_name: str, db: Session) -> CertificateOut:
    program_name = certificate_program_name(row.course)
    rendered = _render_certificate(
        row.course.certificate_template,
        student_name,
        program_name,
        row.issued_at,
    )
    title = get_setting(db, "completion_cert_title") or rendered["title"]
    issued_by = get_setting(db, "institute_name") or "CAISBE"
    return CertificateOut(
        id=row.id,
        certificate_code=row.certificate_code,
        issued_at=row.issued_at,
        course=CourseOut.model_validate(row.course),
        student_name=strip_plain_text(student_name) or student_name,
        title=strip_plain_text(title) or title,
        body=sanitize_html(rendered["body"]) or "",
        program_name=program_name,
        verify_url=_certificate_verify_url(row.certificate_code),
        issued_by=issued_by,
    )


def _membership_to_out(row: MembershipCertificate, student_name: str, db: Session) -> MembershipCertificateOut:
    title, body_template, type_label = membership_certificate_copy(db, row.membership_type)
    issued_by = get_setting(db, "institute_name") or "CAISBE"
    issued_label = row.issued_at.strftime("%B %d, %Y") if row.issued_at else ""
    body = body_template.format(issued_by=issued_by, issued_at=issued_label)
    return MembershipCertificateOut(
        id=row.id,
        certificate_code=row.certificate_code,
        membership_number=row.membership_number,
        membership_type=row.membership_type,
        membership_type_label=type_label,
        issued_at=row.issued_at,
        expires_at=row.expires_at,
        student_name=strip_plain_text(student_name) or student_name,
        title=strip_plain_text(title) or title,
        body=strip_plain_text(body) or body,
        verify_url=_certificate_verify_url(row.certificate_code),
        issued_by=issued_by,
    )


def _progress_counts(db: Session, user: User, course: Course) -> dict[str, int | bool]:
    lesson_ids, quiz_ids, assignment_ids = _course_progress_units(db, course.id)
    topics_completed = 0
    if lesson_ids:
        topics_completed = (
            db.query(LessonProgress)
            .filter(LessonProgress.user_id == user.id, LessonProgress.lesson_id.in_(lesson_ids))
            .count()
        )
    quizzes_completed = 0
    if quiz_ids:
        quizzes_completed = (
            db.query(QuizAttempt.quiz_id)
            .filter(QuizAttempt.user_id == user.id, QuizAttempt.quiz_id.in_(quiz_ids))
            .distinct()
            .count()
        )
    return {
        "topics_completed": topics_completed,
        "topics_total": len(lesson_ids),
        "quizzes_completed": quizzes_completed,
        "quizzes_total": len(quiz_ids),
        "assignments_completed": len(_completed_assignment_ids(db, user.id, assignment_ids)),
        "assignments_total": len(assignment_ids),
        "has_final_exam": course.final_exam is not None,
    }


def _enrollment_to_out(db: Session, user: User, enrollment: Enrollment) -> EnrollmentOut:
    course = enrollment.course
    exam_passed = _user_passed_final_exam(db, user, course) if course else False
    cert = (
        db.query(Certificate)
        .filter(Certificate.user_id == user.id, Certificate.course_id == enrollment.course_id)
        .first()
    )
    counts = _progress_counts(db, user, course) if course is not None else {}
    return EnrollmentOut(
        id=enrollment.id,
        status=enrollment.status,
        progress=enrollment.progress,
        enrolled_at=enrollment.enrolled_at,
        course=CourseOut.model_validate(course),
        exam_passed=exam_passed,
        certificate_code=cert.certificate_code if cert else None,
        topics_completed=int(counts.get("topics_completed", 0)),
        topics_total=int(counts.get("topics_total", 0)),
        quizzes_completed=int(counts.get("quizzes_completed", 0)),
        quizzes_total=int(counts.get("quizzes_total", 0)),
        assignments_completed=int(counts.get("assignments_completed", 0)),
        assignments_total=int(counts.get("assignments_total", 0)),
        has_final_exam=bool(counts.get("has_final_exam", False)),
    )


def _completed_lesson_ids(db: Session, user: User, course: Course) -> set[int]:
    lesson_ids = [lesson.id for chapter in course.chapters for lesson in chapter.lessons]
    if not lesson_ids:
        return set()
    rows = (
        db.query(LessonProgress.lesson_id)
        .filter(LessonProgress.user_id == user.id, LessonProgress.lesson_id.in_(lesson_ids))
        .all()
    )
    return {row[0] for row in rows}


def _require_prior_topics_complete(db: Session, user: User, lesson: Lesson) -> None:
    course = lesson.chapter.course
    done = _completed_lesson_ids(db, user, course)
    for chapter in sorted(course.chapters, key=lambda item: (item.sort_order, item.id)):
        for topic in sorted(chapter.lessons, key=lambda item: (item.sort_order, item.id)):
            if topic.id == lesson.id:
                return
            if topic.id not in done:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Complete the previous topic before continuing.",
                )


def _require_course_topics_complete(db: Session, user: User, course: Course) -> None:
    if not _course_topics_complete(db, user, course):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Complete every topic before the final exam.",
        )


_STUDENT_UPLOAD_SUFFIXES = {
    ".pdf",
    ".doc",
    ".docx",
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
}
_STUDENT_UPLOAD_MAX_BYTES = 25 * 1024 * 1024


def _assignment_file_ok(url: str | None) -> bool:
    from app.services.storage import is_managed_upload_url

    if not url or not url.strip():
        return False
    path = url.strip().split("?")[0].lower()
    return is_managed_upload_url(url) and path.endswith(tuple(_STUDENT_UPLOAD_SUFFIXES))


def _student_assignment_detail(
    block: ContentBlock, row: AssignmentSubmission | None, *, unlocked: bool
) -> StudentAssignmentDetailOut:
    chapter = block.chapter
    course = chapter.course if chapter else None
    submitted_at = latest_submitted_at(row) if row else None
    visible = grade_is_visible(row.status) if row else False
    attempts = sorted(row.attempts, key=lambda item: (item.submitted_at, item.id)) if row else []
    return StudentAssignmentDetailOut(
        block_id=block.id,
        course_id=course.id if course else 0,
        title=block.title or "Assignment",
        instructions_body=block.body,
        instructions_url=block.url,
        instructions_label=block.label,
        course_code=course.code if course else "",
        course_title=course.title if course else "",
        chapter_title=chapter.title if chapter else "",
        points_possible=block.points_possible,
        due_at=block.due_at,
        bucket=status_bucket(row.status if row else None),
        review_status=row.status if row else None,
        score=row.score if row and visible else None,
        feedback=row.feedback if row and visible else None,
        graded_at=row.graded_at if row and visible else None,
        body=row.body if row else None,
        file_url=row.file_url if row else None,
        file_name=row.file_name if row else None,
        submitted_at=submitted_at,
        is_late=submission_is_late(block.due_at, submitted_at),
        can_submit=unlocked and row is None and can_submit_new(block.due_at),
        can_resubmit=unlocked and can_resubmit(row.status, block.due_at) if row else False,
        can_withdraw=can_withdraw(row.status) if row else False,
        unlocked=unlocked,
        attempts=[
            {
                "id": attempt.id,
                "body": attempt.body,
                "file_url": attempt.file_url,
                "file_name": attempt.file_name,
                "submitted_at": attempt.submitted_at,
            }
            for attempt in attempts
        ],
    )


def _load_student_assignment(db: Session, block_id: int) -> tuple[ContentBlock, Course]:
    block = (
        db.query(ContentBlock)
        .options(joinedload(ContentBlock.chapter).joinedload(Chapter.course))
        .filter(ContentBlock.id == block_id)
        .first()
    )
    if block is None or block.block_type != "assignment" or block.chapter is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    course = block.chapter.course
    if course is None or course.status != "published":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    return block, course


def _submission_payload(payload: AssignmentSubmitIn) -> tuple[str | None, str | None, str | None]:
    body = (payload.body or "").strip()
    has_file = _assignment_file_ok(payload.url)
    if has_file == bool(body):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Submit either a document or a written answer.",
        )
    if has_file and payload.url:
        return None, payload.url.strip(), (payload.file_name or "").strip() or None
    return body or None, None, None


EXAM_SUBMIT_GRACE = timedelta(seconds=20)


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _exam_time_limit(exam: FinalExam) -> timedelta | None:
    minutes = exam.time_limit_minutes
    if minutes is None or minutes <= 0:
        return None
    return timedelta(minutes=minutes)


def _exam_session(db: Session, user: User, exam: FinalExam) -> ExamSession | None:
    return (
        db.query(ExamSession)
        .filter(ExamSession.user_id == user.id, ExamSession.final_exam_id == exam.id)
        .first()
    )


VIOLATION_EVENT_TYPES = frozenset(
    {
        "fullscreen_exit",
        "tab_blur",
        "copy_attempt",
        "paste_attempt",
        "cut_attempt",
        "context_menu",
        "print_attempt",
        "devtools_attempt",
    }
)

PRECHECK_TTL = timedelta(minutes=20)


def _session_expired(exam: FinalExam, session: ExamSession, now: datetime) -> bool:
    if session.started_at is None:
        return False
    limit = _exam_time_limit(exam)
    if limit is None:
        return False
    return now > _as_utc(session.started_at) + limit + EXAM_SUBMIT_GRACE


def _remaining_seconds(exam: FinalExam, session: ExamSession, now: datetime) -> int | None:
    if session.started_at is None:
        return None
    limit = _exam_time_limit(exam)
    if limit is None:
        return None
    deadline = _as_utc(session.started_at) + limit
    return max(0, int((deadline - now).total_seconds()))


def _secure_precheck_valid(exam: FinalExam, session: ExamSession | None, now: datetime) -> bool:
    if not exam.secure_mode:
        return True
    if session is None or session.secure_ok_at is None:
        return False
    return now <= _as_utc(session.secure_ok_at) + PRECHECK_TTL


def _record_integrity_event(
    db: Session,
    *,
    user: User,
    exam: FinalExam,
    session: ExamSession | None,
    phase: str,
    event_type: str,
    detail: dict | None = None,
) -> ExamIntegrityEvent:
    event = ExamIntegrityEvent(
        user_id=user.id,
        final_exam_id=exam.id,
        exam_session_id=session.id if session else None,
        phase=phase if phase in {"pre", "live", "post"} else "live",
        event_type=event_type[:64],
        detail_json=json.dumps(detail) if detail is not None else None,
    )
    db.add(event)
    return event


def _apply_violation(
    db: Session,
    *,
    exam: FinalExam,
    session: ExamSession,
    event_type: str,
    now: datetime,
) -> bool:
    """Increment violation_count when needed. Returns True if newly locked out."""
    if event_type not in VIOLATION_EVENT_TYPES:
        return False
    if session.locked_out_at is not None:
        return False
    session.violation_count = int(session.violation_count or 0) + 1
    max_v = max(1, int(exam.max_integrity_violations or 3))
    if session.violation_count >= max_v:
        session.locked_out_at = now
        return True
    return False


def _ensure_pending_session(db: Session, user: User, exam: FinalExam) -> ExamSession:
    session = _exam_session(db, user, exam)
    if session is None:
        session = ExamSession(
            user_id=user.id,
            final_exam_id=exam.id,
            started_at=None,
            order_json=None,
            violation_count=0,
        )
        db.add(session)
        db.flush()
    return session


def _appear_count(exam: FinalExam) -> int:
    bank = len(exam.questions)
    if bank == 0:
        return 0
    configured = exam.questions_to_appear
    if configured is None or configured <= 0:
        return bank
    return min(int(configured), bank)


def _new_exam_order(exam: FinalExam) -> dict[str, list[int] | dict[str, list[int]]]:
    bank = list(exam.questions)
    count = _appear_count(exam)
    selected = random.sample(bank, count) if count < len(bank) else bank[:]
    random.shuffle(selected)
    question_ids: list[int] = []
    choices: dict[str, list[int]] = {}
    for question in selected:
        question_ids.append(question.id)
        choice_ids = [choice.id for choice in question.choices]
        random.shuffle(choice_ids)
        choices[str(question.id)] = choice_ids
    return {"questions": question_ids, "choices": choices}


def _exam_order(session: ExamSession | None) -> ExamOrderOut | None:
    if session is None or not session.order_json:
        return None
    try:
        raw = json.loads(session.order_json)
    except json.JSONDecodeError:
        return None
    questions = raw.get("questions")
    choices = raw.get("choices")
    if not isinstance(questions, list) or not isinstance(choices, dict):
        return None
    return ExamOrderOut(
        questions=[int(item) for item in questions],
        choices={str(key): [int(choice_id) for choice_id in value] for key, value in choices.items()},
    )


def _ensure_exam_order(db: Session, session: ExamSession, exam: FinalExam) -> None:
    if session.order_json:
        return
    session.order_json = json.dumps(_new_exam_order(exam))
    db.flush()


def _questions_for_order(exam: FinalExam, order: ExamOrderOut | None) -> list[QuizQuestion]:
    """Return exam questions in session order (subset only — never append bank leftovers)."""
    by_id = {question.id: question for question in exam.questions}
    if order is None:
        return list(exam.questions)
    return [by_id[qid] for qid in order.questions if qid in by_id]


def _student_questions_for_order(exam: FinalExam, order: ExamOrderOut | None) -> list[QuizQuestionStudentOut]:
    selected = _questions_for_order(exam, order)
    if order is None:
        return [QuizQuestionStudentOut.model_validate(question) for question in selected]

    out: list[QuizQuestionStudentOut] = []
    for question in selected:
        choice_ids = order.choices.get(str(question.id))
        base = QuizQuestionStudentOut.model_validate(question)
        if not choice_ids:
            out.append(base)
            continue
        by_id = {choice.id: choice for choice in base.choices}
        ordered_choices = [by_id[cid] for cid in choice_ids if cid in by_id]
        out.append(base.model_copy(update={"choices": ordered_choices}))
    return out


def _latest_exam_attempt(db: Session, user: User, exam: FinalExam) -> QuizAttempt | None:
    return (
        db.query(QuizAttempt)
        .filter(QuizAttempt.user_id == user.id, QuizAttempt.final_exam_id == exam.id)
        .order_by(QuizAttempt.created_at.desc(), QuizAttempt.id.desc())
        .first()
    )


def _close_expired_exam_session(db: Session, user: User, exam: FinalExam, now: datetime) -> QuizAttempt | None:
    session = (
        db.query(ExamSession)
        .filter(ExamSession.user_id == user.id, ExamSession.final_exam_id == exam.id)
        .with_for_update()
        .first()
    )
    if session is None or not _session_expired(exam, session, now):
        return None
    attempt = QuizAttempt(
        user_id=user.id,
        final_exam_id=exam.id,
        score=0,
        passed=False,
        answers_json="{}",
    )
    db.add(attempt)
    db.delete(session)
    db.flush()
    return attempt


def _exam_session_state(db: Session, user: User, exam: FinalExam, now: datetime) -> ExamSessionOut:
    _close_expired_exam_session(db, user, exam, now)
    session = _exam_session(db, user, exam)
    in_progress = session is not None and session.started_at is not None
    if in_progress and session is not None:
        _ensure_exam_order(db, session, exam)
    latest = _latest_exam_attempt(db, user, exam)
    order = _exam_order(session) if in_progress else None
    return ExamSessionOut(
        in_progress=in_progress,
        started_at=session.started_at if session else None,
        remaining_seconds=_remaining_seconds(exam, session, now) if in_progress and session else None,
        time_limit_minutes=exam.time_limit_minutes,
        latest_score=None if in_progress or latest is None else latest.score,
        latest_passed=None if in_progress or latest is None else latest.passed,
        order=order,
        questions=_student_questions_for_order(exam, order) if in_progress else [],
        secure_mode=bool(exam.secure_mode),
        secure_ok=_secure_precheck_valid(exam, session, now),
        violation_count=int(session.violation_count or 0) if session else 0,
        max_integrity_violations=max(1, int(exam.max_integrity_violations or 3)),
        locked_out=bool(session and session.locked_out_at is not None),
    )


def _require_open_exam(db: Session, user: User, course: Course) -> FinalExam:
    from app.services.access_control import require_exam_open

    enrollment = require_active_enrollment(db, user, course.id)
    require_exam_open(enrollment)
    _require_course_topics_complete(db, user, course)
    exam = course.final_exam
    if exam is None or not exam.questions:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Final exam not configured")
    if _user_passed_final_exam(db, user, course):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You already passed this exam.")
    return exam


_MEMBERSHIP_DOC_SUFFIXES = {".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png", ".webp"}
_MEMBERSHIP_FORM_SUFFIXES = {".pdf", ".doc", ".docx"}


async def _save_membership_upload(
    uploaded: UploadFile,
    *,
    allowed_suffixes: set[str],
    folder: str,
    max_bytes: int = 20 * 1024 * 1024,
    invalid_detail: str = "Upload a PDF, Word, or image file.",
) -> tuple[str, str]:
    from app.services.storage import save_upload

    url, display = await save_upload(
        uploaded,
        allowed_suffixes=allowed_suffixes,
        max_bytes=max_bytes,
        folder=folder,
        invalid_detail=invalid_detail,
        empty_detail="Uploaded file is empty.",
        too_large_detail="File is too large. Maximum size is 20 MB.",
    )
    original_name = Path(uploaded.filename or display).name
    return url, original_name


def _append_supporting_document_details(
    details: str | None,
    *,
    label: str,
    original_name: str,
    file_url: str,
) -> str:
    block = f"{label}: {original_name}\nFile: {file_url}"
    base = (details or "").strip()
    return f"{base}\n{block}".strip() if base else block



__all__ = [name for name in globals() if not name.startswith('__')]

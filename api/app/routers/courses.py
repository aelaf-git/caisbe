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
)
from app.schemas.auth import MembershipApplicationIn, MembershipApplicationOut
from app.schemas.courses import (
    AssignmentSubmitIn,
    CertificateOut,
    UploadOut,
    CertificateVerifyOut,
    CourseDetailStudentOut,
    CourseOut,
    EnrollmentOut,
    ExamOrderOut,
    ExamSessionOut,
    MembershipCertificateOut,
    QuizAnswerReview,
    QuizAttemptOut,
    QuizQuestionStudentOut,
    QuizSubmitIn,
)
from app.services.membership import (
    activate_membership,
    issue_membership_certificate,
    membership_certificate_copy,
    membership_is_expired,
    record_membership_application,
)
from app.services.settings import get_setting

from app.services.commerce import apply_profile_fields, normalize_membership_type, require_active_enrollment

router = APIRouter(tags=["courses"])


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
    if not assignment_ids:
        return {}
    # Promote older completion-only rows so progress and review stay linked.
    existing = {
        row[0]
        for row in db.query(AssignmentSubmission.content_block_id)
        .filter(
            AssignmentSubmission.user_id == user_id,
            AssignmentSubmission.content_block_id.in_(assignment_ids),
        )
        .all()
    }
    legacy_rows = (
        db.query(BlockCompletion)
        .filter(
            BlockCompletion.user_id == user_id,
            BlockCompletion.content_block_id.in_(assignment_ids),
        )
        .all()
    )
    created = False
    for row in legacy_rows:
        if row.content_block_id in existing:
            continue
        db.add(
            AssignmentSubmission(
                user_id=user_id,
                content_block_id=row.content_block_id,
                body="Submitted earlier.",
                status="under_review",
            )
        )
        existing.add(row.content_block_id)
        created = True
    if created:
        db.flush()

    status_map = {
        row.content_block_id: row.status
        for row in db.query(AssignmentSubmission)
        .filter(
            AssignmentSubmission.user_id == user_id,
            AssignmentSubmission.content_block_id.in_(assignment_ids),
        )
        .all()
    }
    return status_map


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
    base = settings.portal_public_url.rstrip("/")
    return f"{base}/certificates/verify/{certificate_code}"


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
    return certificate_code


def _certificate_to_out(row: Certificate, student_name: str, db: Session) -> CertificateOut:
    rendered = _render_certificate(
        row.course.certificate_template,
        student_name,
        row.course.title,
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
    enrollment = (
        db.query(Enrollment)
        .filter(Enrollment.user_id == current_user.id, Enrollment.course_id == course_id)
        .first()
    )
    if enrollment is None or enrollment.status not in {"enrolled", "completed"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Course access unlocks after payment.",
        )

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
    submission_status = _assignment_review_status(db, current_user.id, assignment_ids)
    if db.new or db.dirty:
        db.commit()

    for chapter in detail.chapters:
        for lesson in chapter.lessons:
            lesson.completed = lesson.id in completed_ids
        for block in chapter.blocks:
            if block.block_type == "quiz":
                block.completed = block.quiz is not None and block.quiz.id in done_quizzes
            elif block.block_type == "assignment":
                block.completed = block.id in submission_status
                block.review_status = submission_status.get(block.id)

    return detail


def _enrollment_to_out(db: Session, user: User, enrollment: Enrollment) -> EnrollmentOut:
    course = enrollment.course
    exam_passed = _user_passed_final_exam(db, user, course) if course else False
    cert = (
        db.query(Certificate)
        .filter(Certificate.user_id == user.id, Certificate.course_id == enrollment.course_id)
        .first()
    )
    return EnrollmentOut(
        id=enrollment.id,
        status=enrollment.status,
        progress=enrollment.progress,
        enrolled_at=enrollment.enrolled_at,
        course=CourseOut.model_validate(course),
        exam_passed=exam_passed,
        certificate_code=cert.certificate_code if cert else None,
    )


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
    return [_enrollment_to_out(db, current_user, row) for row in rows]


@router.post("/me/enrollments", status_code=status.HTTP_400_BAD_REQUEST)
def enroll_in_course() -> None:
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Complete checkout to enroll. Use POST /me/checkout.",
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

    existing = (
        db.query(QuizAttempt)
        .filter(QuizAttempt.user_id == current_user.id, QuizAttempt.quiz_id == quiz.id)
        .order_by(QuizAttempt.id.asc())
        .first()
    )
    if existing is not None:
        stored = json.loads(existing.answers_json or "{}")
        if not isinstance(stored, dict):
            stored = {}
        checked = {}
        for key, value in stored.items():
            try:
                checked[str(key)] = int(value)
            except (TypeError, ValueError):
                continue
        _apply_progress(db, current_user, course_id)
        db.commit()
        return QuizAttemptOut(
            id=existing.id,
            score=existing.score,
            passed=True,
            certificate_code=None,
            reviews=_answer_reviews(quiz.questions, checked),
        )

    score, _, _ = _score_answers(quiz.questions, payload.answers)
    passed = True
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


@router.post("/me/uploads", response_model=UploadOut)
async def student_upload(
    request: Request,
    current_user: User = Depends(get_current_user),
) -> UploadOut:
    if current_user.role == "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Use the admin upload.")
    form = await request.form(max_part_size=25 * 1024 * 1024)
    uploaded = form.get("file")
    if not isinstance(uploaded, UploadFile):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing file upload")
    suffix = Path(uploaded.filename or "file").suffix.lower()
    if suffix not in {".pdf", ".doc", ".docx"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Upload a PDF or Word file.")
    upload_root = Path(settings.upload_dir)
    upload_root.mkdir(parents=True, exist_ok=True)
    safe_name = f"{uuid.uuid4().hex}{suffix}"
    dest = upload_root / safe_name
    data = await uploaded.read()
    if not data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty")
    if len(data) > 25 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File is too large.")
    dest.write_bytes(data)
    return UploadOut(url=f"/api/uploads/{safe_name}", filename=(uploaded.filename or safe_name)[:120])


def _assignment_file_ok(url: str | None) -> bool:
    if not url or not url.strip():
        return False
    path = url.strip().split("?")[0].lower()
    return "/api/uploads/" in path and path.endswith((".pdf", ".doc", ".docx"))


@router.post("/me/blocks/{block_id}/submit")
def submit_assignment(
    block_id: int,
    payload: AssignmentSubmitIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, int | str | bool]:
    block = (
        db.query(ContentBlock)
        .options(joinedload(ContentBlock.chapter))
        .filter(ContentBlock.id == block_id)
        .first()
    )
    if block is None or block.block_type != "assignment" or block.chapter_id is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    course = db.query(Course).filter(Course.id == block.chapter.course_id).first()
    if course is None or course.status != "published":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    require_active_enrollment(db, current_user, course.id)
    existing = (
        db.query(AssignmentSubmission)
        .filter(
            AssignmentSubmission.user_id == current_user.id,
            AssignmentSubmission.content_block_id == block.id,
        )
        .first()
    )
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This assignment is already submitted.")
    body = (payload.body or "").strip()
    has_file = _assignment_file_ok(payload.url)
    if has_file == bool(body):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Submit either a document or a written answer.",
        )
    db.add(
        AssignmentSubmission(
            user_id=current_user.id,
            content_block_id=block.id,
            body=body or None,
            file_url=payload.url.strip() if has_file and payload.url else None,
            file_name=(payload.file_name or "").strip() or None,
            status="under_review",
        )
    )
    db.flush()
    enrollment = _apply_progress(db, current_user, course.id)
    db.commit()
    return {"completed": True, "status": "under_review", "progress": enrollment.progress}


@router.delete("/me/blocks/{block_id}/submit")
def unsubmit_assignment(
    block_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, int | bool]:
    block = (
        db.query(ContentBlock)
        .options(joinedload(ContentBlock.chapter))
        .filter(ContentBlock.id == block_id)
        .first()
    )
    if block is None or block.block_type != "assignment" or block.chapter_id is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    course = db.query(Course).filter(Course.id == block.chapter.course_id).first()
    if course is None or course.status != "published":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
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


def _session_expired(exam: FinalExam, session: ExamSession, now: datetime) -> bool:
    limit = _exam_time_limit(exam)
    if limit is None:
        return False
    return now > _as_utc(session.started_at) + limit + EXAM_SUBMIT_GRACE


def _remaining_seconds(exam: FinalExam, session: ExamSession, now: datetime) -> int | None:
    limit = _exam_time_limit(exam)
    if limit is None:
        return None
    deadline = _as_utc(session.started_at) + limit
    return max(0, int((deadline - now).total_seconds()))


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
    if session is not None:
        _ensure_exam_order(db, session, exam)
    latest = _latest_exam_attempt(db, user, exam)
    in_progress = session is not None
    order = _exam_order(session) if in_progress else None
    return ExamSessionOut(
        in_progress=in_progress,
        started_at=session.started_at if session else None,
        remaining_seconds=_remaining_seconds(exam, session, now) if session else None,
        time_limit_minutes=exam.time_limit_minutes,
        latest_score=None if in_progress or latest is None else latest.score,
        latest_passed=None if in_progress or latest is None else latest.passed,
        order=order,
        questions=_student_questions_for_order(exam, order) if in_progress else [],
    )


def _require_open_exam(db: Session, user: User, course: Course) -> FinalExam:
    require_active_enrollment(db, user, course.id)
    _require_course_topics_complete(db, user, course)
    exam = course.final_exam
    if exam is None or not exam.questions:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Final exam not configured")
    if _user_passed_final_exam(db, user, course):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You already passed this exam.")
    return exam


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


@router.post("/me/courses/{course_id}/final-exam/start", response_model=ExamSessionOut)
def start_final_exam(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ExamSessionOut:
    course = _load_published_course(db, course_id)
    exam = _require_open_exam(db, current_user, course)
    now = datetime.now(timezone.utc)
    expired = _close_expired_exam_session(db, current_user, exam, now)
    session = _exam_session(db, current_user, exam)
    if session is None and expired is None:
        session = ExamSession(
            user_id=current_user.id,
            final_exam_id=exam.id,
            started_at=now,
            order_json=json.dumps(_new_exam_order(exam)),
        )
        db.add(session)
        db.flush()
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
    if session is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Start the exam before submitting.")

    timed_out = _session_expired(exam, session, now)
    if timed_out:
        score = 0
        passed = False
        answers_json = "{}"
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
    )


@router.get("/me/certificates", response_model=list[CertificateOut])
def list_my_certificates(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[CertificateOut]:
    rows = (
        db.query(Certificate)
        .options(joinedload(Certificate.course).joinedload(Course.certificate_template))
        .filter(Certificate.user_id == current_user.id)
        .order_by(Certificate.issued_at.desc())
        .all()
    )
    return [_certificate_to_out(row, current_user.full_name, db) for row in rows]


@router.get("/me/notifications")
def list_my_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    from app.schemas.notifications import NotificationListOut, NotificationOut
    from app.services.notifications import list_user_notifications, unread_notification_count

    items = list_user_notifications(db, current_user)
    return NotificationListOut(
        unread_count=unread_notification_count(db, current_user),
        items=[NotificationOut.model_validate(row) for row in items],
    ).model_dump()


@router.post("/me/notifications/{notification_id}/read")
def mark_my_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    from app.schemas.notifications import NotificationOut
    from app.services.notifications import mark_notification_read

    row = mark_notification_read(db, current_user, notification_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    db.commit()
    return NotificationOut.model_validate(row).model_dump()


@router.post("/me/notifications/read-all")
def mark_all_my_notifications_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, int]:
    from app.services.notifications import mark_all_notifications_read

    count = mark_all_notifications_read(db, current_user)
    db.commit()
    return {"marked": count}


@router.get("/me/membership-certificate", response_model=MembershipCertificateOut)
def get_my_membership_certificate(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MembershipCertificateOut:
    if current_user.role == "admin":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Membership certificate not found")
    from app.services.membership import is_student_membership, membership_is_accessible

    if not is_student_membership(current_user.membership_type) and not membership_is_accessible(
        db, current_user
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Complete payment to unlock your membership certificate.",
        )
    row = issue_membership_certificate(db, current_user)
    db.commit()
    db.refresh(row)
    return _membership_to_out(row, current_user.full_name, db)


_MEMBERSHIP_DOC_SUFFIXES = {".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png", ".webp"}
_MEMBERSHIP_FORM_SUFFIXES = {".pdf", ".doc", ".docx"}


async def _save_membership_upload(
    uploaded: UploadFile,
    *,
    allowed_suffixes: set[str],
    max_bytes: int = 20 * 1024 * 1024,
    invalid_detail: str = "Upload a PDF, Word, or image file.",
) -> tuple[str, str]:
    suffix = Path(uploaded.filename or "").suffix.lower()
    if suffix not in allowed_suffixes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=invalid_detail,
        )
    upload_root = Path(settings.upload_dir)
    upload_root.mkdir(parents=True, exist_ok=True)
    safe_name = f"{uuid.uuid4().hex}{suffix}"
    dest = upload_root / safe_name
    written = 0
    try:
        with dest.open("wb") as out:
            while True:
                chunk = await uploaded.read(1024 * 1024)
                if not chunk:
                    break
                written += len(chunk)
                if written > max_bytes:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail="File is too large. Maximum size is 20 MB.",
                    )
                out.write(chunk)
    except HTTPException:
        dest.unlink(missing_ok=True)
        raise
    except Exception:
        dest.unlink(missing_ok=True)
        raise
    if written == 0:
        dest.unlink(missing_ok=True)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")
    original_name = Path(uploaded.filename or safe_name).name
    return f"/api/uploads/{safe_name}", original_name


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


@router.post("/me/membership/apply", response_model=MembershipApplicationOut, status_code=status.HTTP_201_CREATED)
async def apply_my_membership(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MembershipApplicationOut:
    if current_user.role == "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admins cannot apply for membership.")

    content_type = (request.headers.get("content-type") or "").lower()
    supporting_note: str | None = None
    if "multipart/form-data" in content_type:
        form = await request.form(max_part_size=20 * 1024 * 1024)
        payload = MembershipApplicationIn(
            full_name=str(form.get("full_name") or ""),
            email=str(form.get("email") or current_user.email),
            phone=str(form.get("phone") or ""),
            country=str(form.get("country") or ""),
            city=str(form.get("city") or ""),
            address=(str(form.get("address") or "").strip() or None),
            organization=(str(form.get("organization") or "").strip() or None),
            job_title=(str(form.get("job_title") or "").strip() or None),
            membership_type=str(form.get("membership_type") or "student"),
            details=(str(form.get("details") or "").strip() or None),
            kind=(str(form.get("kind") or "").strip() or None),
        )
        uploaded = form.get("supporting_document")
        if isinstance(uploaded, UploadFile) and (uploaded.filename or "").strip():
            label = (
                str(form.get("supporting_document_label") or "Supporting document").strip()
                or "Supporting document"
            )
            file_url, original_name = await _save_membership_upload(
                uploaded,
                allowed_suffixes=_MEMBERSHIP_DOC_SUFFIXES,
            )
            supporting_note = f"{label}: {original_name}\nFile: {file_url}"
    else:
        payload = MembershipApplicationIn.model_validate(await request.json())

    membership_type = normalize_membership_type(payload.membership_type) or "student"
    apply_profile_fields(
        current_user,
        {
            "full_name": payload.full_name,
            "phone": payload.phone,
            "country": payload.country,
            "city": payload.city,
            "address": payload.address,
            "organization": payload.organization,
            "job_title": payload.job_title,
        },
    )
    renew = (payload.kind or "").strip().lower() == "renewal"
    details = (payload.details or "").strip() or None
    if supporting_note:
        details = f"{details}\n{supporting_note}".strip() if details else supporting_note
    from app.services.membership import is_student_membership

    if is_student_membership(membership_type):
        activate_membership(db, current_user, membership_type, renew=renew)
        status_value = "active"
    else:
        # Keep current active membership (usually student) until Stripe payment.
        status_value = "pending_payment"
    application = record_membership_application(
        db,
        current_user,
        membership_type=membership_type,
        details=details,
        status_value=status_value,
    )
    db.commit()
    db.refresh(application)
    return MembershipApplicationOut.model_validate(application)


@router.post("/me/membership/supporting-document", response_model=MembershipApplicationOut, status_code=status.HTTP_201_CREATED)
async def upload_membership_supporting_document(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MembershipApplicationOut:
    """Attach a supporting document to the member's latest membership application."""
    if current_user.role == "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admins cannot apply for membership.")
    form = await request.form(max_part_size=20 * 1024 * 1024)
    uploaded = form.get("file") or form.get("supporting_document")
    if not isinstance(uploaded, UploadFile) or not (uploaded.filename or "").strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Choose a supporting document to upload.")
    label = str(form.get("label") or form.get("supporting_document_label") or "Supporting document").strip()
    file_url, original_name = await _save_membership_upload(
        uploaded,
        allowed_suffixes=_MEMBERSHIP_DOC_SUFFIXES,
    )
    application = (
        db.query(MembershipApplication)
        .filter(MembershipApplication.user_id == current_user.id)
        .order_by(MembershipApplication.id.desc())
        .first()
    )
    note = f"{label}: {original_name}\nFile: {file_url}"
    if application is None:
        application = record_membership_application(
            db,
            current_user,
            membership_type=current_user.membership_type or "student",
            details=note,
            status_value=current_user.membership_status or "active",
        )
    else:
        application.details = _append_supporting_document_details(
            application.details,
            label=label,
            original_name=original_name,
            file_url=file_url,
        )
    db.commit()
    db.refresh(application)
    return MembershipApplicationOut.model_validate(application)


@router.post("/me/membership/apply-file", response_model=MembershipApplicationOut, status_code=status.HTTP_201_CREATED)
async def apply_my_membership_file(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MembershipApplicationOut:
    if current_user.role == "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admins cannot apply for membership.")
    form = await request.form(max_part_size=20 * 1024 * 1024)
    uploaded = form.get("file")
    if not isinstance(uploaded, UploadFile):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Choose a completed form to upload.")
    file_url, original_name = await _save_membership_upload(
        uploaded,
        allowed_suffixes=_MEMBERSHIP_FORM_SUFFIXES,
        invalid_detail="Upload a PDF or Word file.",
    )

    kind = str(form.get("kind") or "application").strip().lower()
    kind_label = "Renewal" if kind == "renewal" else "New membership"
    details = f"{kind_label}\nUploaded form: {original_name}\nFile: {file_url}"
    membership_type = current_user.membership_type or "student"
    from app.services.membership import is_student_membership

    if is_student_membership(membership_type):
        activate_membership(db, current_user, membership_type, renew=kind == "renewal")
        status_value = "active"
    else:
        status_value = "pending_payment"
    application = record_membership_application(
        db,
        current_user,
        membership_type=membership_type,
        details=details,
        status_value=status_value,
    )
    db.commit()
    db.refresh(application)
    return MembershipApplicationOut.model_validate(application)


@router.get("/me/certificates/{certificate_code}", response_model=CertificateOut)
def get_certificate(
    certificate_code: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CertificateOut:
    row = (
        db.query(Certificate)
        .options(joinedload(Certificate.course).joinedload(Course.certificate_template))
        .filter(Certificate.certificate_code == certificate_code, Certificate.user_id == current_user.id)
        .first()
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Certificate not found")

    return _certificate_to_out(row, current_user.full_name, db)


@router.get("/certificates/verify/{certificate_code}", response_model=CertificateVerifyOut)
@limiter.limit("60/minute")
def verify_certificate(
    request: Request,
    certificate_code: str,
    db: Session = Depends(get_db),
) -> CertificateVerifyOut:
    issued_by = get_setting(db, "institute_name") or "CAISBE"
    row = (
        db.query(Certificate)
        .options(joinedload(Certificate.course), joinedload(Certificate.user))
        .filter(Certificate.certificate_code == certificate_code)
        .first()
    )
    if row is not None:
        enrollment = (
            db.query(Enrollment)
            .filter(Enrollment.user_id == row.user_id, Enrollment.course_id == row.course_id)
            .first()
        )
        valid = enrollment is not None and enrollment.status == "completed"
        return CertificateVerifyOut(
            valid=valid,
            kind="completion",
            certificate_code=row.certificate_code,
            student_name=row.user.full_name,
            course_title=row.course.title,
            membership_number=None,
            issued_at=row.issued_at,
            issued_by=issued_by,
            verify_url=_certificate_verify_url(row.certificate_code),
        )

    membership = (
        db.query(MembershipCertificate)
        .options(joinedload(MembershipCertificate.user))
        .filter(MembershipCertificate.certificate_code == certificate_code)
        .first()
    )
    if membership is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Certificate not found")

    from app.services.membership import is_student_membership, membership_is_accessible

    user = membership.user
    accessible = membership_is_accessible(db, user)
    if not is_student_membership(membership.membership_type):
        type_matches = (user.membership_type or "") == (membership.membership_type or "")
        valid = accessible and type_matches and not membership_is_expired(membership)
    else:
        valid = accessible and not membership_is_expired(membership)

    return CertificateVerifyOut(
        valid=valid,
        kind="membership",
        certificate_code=membership.certificate_code,
        student_name=membership.user.full_name,
        course_title=None,
        membership_number=membership.membership_number,
        issued_at=membership.issued_at,
        expires_at=membership.expires_at,
        issued_by=issued_by,
        verify_url=_certificate_verify_url(membership.certificate_code),
    )

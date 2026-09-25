from __future__ import annotations

import json
import secrets
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.config import settings
from app.db import get_db
from app.security.auth import get_current_user
from app.security.html_sanitize import sanitize_html, strip_plain_text
from app.models import (
    Certificate,
    CertificateTemplate,
    Chapter,
    ContentBlock,
    Course,
    Enrollment,
    FinalExam,
    Lesson,
    BlockCompletion,
    LessonProgress,
    MembershipCertificate,
    Quiz,
    QuizAttempt,
    QuizQuestion,
    User,
)
from app.schemas.courses import (
    CertificateOut,
    CertificateVerifyOut,
    CourseDetailStudentOut,
    CourseOut,
    EnrollmentOut,
    MembershipCertificateOut,
    QuizAnswerReview,
    QuizAttemptOut,
    QuizSubmitIn,
)
from app.services.membership import issue_membership_certificate, student_has_completed_course
from app.services.settings import get_setting

from app.services.commerce import require_active_enrollment

router = APIRouter(tags=["courses"])


def _lesson_ids_for_course(course: Course) -> list[int]:
    ids: list[int] = []
    for chapter in course.chapters:
        for lesson in chapter.lessons:
            ids.append(lesson.id)
    return ids


def _course_progress_units(course: Course) -> tuple[list[int], list[int], list[int]]:
    lesson_ids: list[int] = []
    quiz_ids: list[int] = []
    assignment_ids: list[int] = []
    for chapter in course.chapters:
        for lesson in chapter.lessons:
            lesson_ids.append(lesson.id)
        for block in chapter.blocks or []:
            if block.block_type == "quiz" and block.quiz_id:
                quiz_ids.append(block.quiz_id)
            elif block.block_type == "assignment":
                assignment_ids.append(block.id)
    return lesson_ids, quiz_ids, assignment_ids


def _recompute_progress(db: Session, user: User, course: Course, enrollment: Enrollment) -> None:
    lesson_ids, quiz_ids, assignment_ids = _course_progress_units(course)
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
    if assignment_ids:
        completed += (
            db.query(BlockCompletion)
            .filter(
                BlockCompletion.user_id == user.id,
                BlockCompletion.content_block_id.in_(assignment_ids),
            )
            .count()
        )
    enrollment.progress = int(round(100 * completed / total))


def _apply_progress(db: Session, user: User, course_id: int) -> Enrollment:
    course = _load_published_course(db, course_id)
    enrollment = require_active_enrollment(db, user, course_id)
    _recompute_progress(db, user, course, enrollment)
    if enrollment.progress >= 100 and enrollment.status != "completed":
        if course.final_exam is None or _user_passed_final_exam(db, user, course):
            _finalize_course_completion(db, user, course, enrollment)
    return enrollment


def _load_published_course(db: Session, course_id: int) -> Course:
    course = (
        db.query(Course)
        .options(
            joinedload(Course.chapters)
            .joinedload(Chapter.lessons)
            .joinedload(Lesson.blocks)
            .joinedload(ContentBlock.quiz)
            .joinedload(Quiz.questions)
            .joinedload(QuizQuestion.choices),
            joinedload(Course.chapters)
            .joinedload(Chapter.blocks)
            .joinedload(ContentBlock.quiz)
            .joinedload(Quiz.questions)
            .joinedload(QuizQuestion.choices),
            joinedload(Course.final_exam).joinedload(FinalExam.questions).joinedload(QuizQuestion.choices),
            joinedload(Course.certificate_template),
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
    certificate_code = f"CAISBE-{course.code}-{secrets.token_hex(4).upper()}"
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
    enrollment.status = "completed"
    enrollment.progress = 100
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
    title = get_setting(db, "membership_cert_title") or "Certificate of Membership"
    issued_by = get_setting(db, "institute_name") or "CAISBE"
    return MembershipCertificateOut(
        id=row.id,
        certificate_code=row.certificate_code,
        membership_number=row.membership_number,
        issued_at=row.issued_at,
        student_name=strip_plain_text(student_name) or student_name,
        title=title,
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
    if course.final_exam:
        attempt = (
            db.query(QuizAttempt)
            .filter(
                QuizAttempt.user_id == current_user.id,
                QuizAttempt.final_exam_id == course.final_exam.id,
                QuizAttempt.passed.is_(True),
            )
            .first()
        )
        exam_passed = attempt is not None

    detail = CourseDetailStudentOut.model_validate(course)
    detail.enrolled = True
    detail.progress = enrollment.progress
    detail.certificate_code = cert.certificate_code if cert else None
    detail.exam_passed = exam_passed

    _, quiz_ids, assignment_ids = _course_progress_units(course)
    done_quizzes = set()
    if quiz_ids:
        done_quizzes = {
            row[0]
            for row in db.query(QuizAttempt.quiz_id)
            .filter(QuizAttempt.user_id == current_user.id, QuizAttempt.quiz_id.in_(quiz_ids))
            .distinct()
            .all()
        }
    done_assignments = set()
    if assignment_ids:
        done_assignments = {
            row[0]
            for row in db.query(BlockCompletion.content_block_id)
            .filter(
                BlockCompletion.user_id == current_user.id,
                BlockCompletion.content_block_id.in_(assignment_ids),
            )
            .all()
        }

    for chapter in detail.chapters:
        for lesson in chapter.lessons:
            lesson.completed = lesson.id in completed_ids
        for block in chapter.blocks:
            if block.block_type == "quiz":
                block.completed = block.quiz is not None and block.quiz.id in done_quizzes
            elif block.block_type == "assignment":
                block.completed = block.id in done_assignments

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
    done = _completed_lesson_ids(db, user, course)
    for chapter in course.chapters:
        for topic in chapter.lessons:
            if topic.id not in done:
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
    if enrollment.progress >= 100:
        if course.final_exam is None:
            if enrollment.status != "completed":
                certificate_code = _finalize_course_completion(db, current_user, course, enrollment)
            else:
                certificate_code = _issue_certificate(db, current_user, course)
        elif _user_passed_final_exam(db, current_user, course):
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


@router.post("/me/blocks/{block_id}/complete")
def complete_block(
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
        db.query(BlockCompletion)
        .filter(BlockCompletion.user_id == current_user.id, BlockCompletion.content_block_id == block.id)
        .first()
    )
    if existing is None:
        db.add(BlockCompletion(user_id=current_user.id, content_block_id=block.id))
        db.flush()
    enrollment = _apply_progress(db, current_user, course.id)
    db.commit()
    return {"completed": True, "progress": enrollment.progress}


@router.post("/me/courses/{course_id}/final-exam/submit", response_model=QuizAttemptOut)
def submit_final_exam(
    course_id: int,
    payload: QuizSubmitIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> QuizAttemptOut:
    course = _load_published_course(db, course_id)
    require_active_enrollment(db, current_user, course_id)
    _require_course_topics_complete(db, current_user, course)

    exam = course.final_exam
    if exam is None or not exam.questions:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Final exam not configured")

    score, _, _ = _score_answers(exam.questions, payload.answers)
    passed = score >= exam.pass_percent
    attempt = QuizAttempt(
        user_id=current_user.id,
        final_exam_id=exam.id,
        score=score,
        passed=passed,
        answers_json=json.dumps(payload.answers),
    )
    db.add(attempt)

    certificate_code = None
    if passed:
        enrollment = require_active_enrollment(db, current_user, course_id)
        certificate_code = _finalize_course_completion(db, current_user, course, enrollment)

    db.commit()
    db.refresh(attempt)
    return QuizAttemptOut(
        id=attempt.id,
        score=attempt.score,
        passed=attempt.passed,
        certificate_code=certificate_code,
        reviews=_answer_reviews(exam.questions, payload.answers),
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


@router.get("/me/membership-certificate", response_model=MembershipCertificateOut)
def get_my_membership_certificate(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MembershipCertificateOut:
    if current_user.role == "admin":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Membership certificate not found")
    if not student_has_completed_course(db, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Complete at least one course to unlock your membership certificate.",
        )
    row = issue_membership_certificate(db, current_user)
    db.commit()
    db.refresh(row)
    return _membership_to_out(row, current_user.full_name, db)


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
def verify_certificate(
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
        return CertificateVerifyOut(
            valid=True,
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

    return CertificateVerifyOut(
        valid=True,
        kind="membership",
        certificate_code=membership.certificate_code,
        student_name=membership.user.full_name,
        course_title=None,
        membership_number=membership.membership_number,
        issued_at=membership.issued_at,
        issued_by=issued_by,
        verify_url=_certificate_verify_url(membership.certificate_code),
    )

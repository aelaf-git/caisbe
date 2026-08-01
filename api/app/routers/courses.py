from __future__ import annotations

import json
import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user
from app.db import get_db
from app.models import (
    Certificate,
    Chapter,
    ContentBlock,
    Course,
    Enrollment,
    FinalExam,
    Lesson,
    LessonProgress,
    Quiz,
    QuizAttempt,
    QuizQuestion,
    User,
)
from app.schemas.courses import (
    CertificateOut,
    CourseDetailStudentOut,
    CourseOut,
    EnrollmentCreate,
    EnrollmentOut,
    QuizAttemptOut,
    QuizSubmitIn,
)

router = APIRouter(tags=["courses"])


def _require_enrollment(db: Session, user: User, course_id: int) -> Enrollment:
    enrollment = (
        db.query(Enrollment)
        .filter(Enrollment.user_id == user.id, Enrollment.course_id == course_id)
        .first()
    )
    if enrollment is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enrolled in this course")
    return enrollment


def _lesson_ids_for_course(course: Course) -> list[int]:
    ids: list[int] = []
    for chapter in course.chapters:
        for lesson in chapter.lessons:
            ids.append(lesson.id)
    return ids


def _recompute_progress(db: Session, user: User, course: Course, enrollment: Enrollment) -> None:
    lesson_ids = _lesson_ids_for_course(course)
    if not lesson_ids:
        enrollment.progress = 0
        return
    completed = (
        db.query(LessonProgress)
        .filter(LessonProgress.user_id == user.id, LessonProgress.lesson_id.in_(lesson_ids))
        .count()
    )
    enrollment.progress = int(round(100 * completed / len(lesson_ids)))


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
    if enrollment is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enrolled in this course")

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

    for chapter in detail.chapters:
        for lesson in chapter.lessons:
            lesson.completed = lesson.id in completed_ids

    return detail


@router.get("/me/enrollments", response_model=list[EnrollmentOut])
def list_my_enrollments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Enrollment]:
    return (
        db.query(Enrollment)
        .options(joinedload(Enrollment.course))
        .filter(Enrollment.user_id == current_user.id)
        .order_by(Enrollment.enrolled_at.desc())
        .all()
    )


@router.post("/me/enrollments", response_model=EnrollmentOut, status_code=status.HTTP_201_CREATED)
def enroll_in_course(
    payload: EnrollmentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Enrollment:
    course = (
        db.query(Course)
        .filter(Course.id == payload.course_id, Course.status == "published")
        .first()
    )
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    existing = (
        db.query(Enrollment)
        .filter(Enrollment.user_id == current_user.id, Enrollment.course_id == course.id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Already enrolled")

    enrollment = Enrollment(user_id=current_user.id, course_id=course.id, status="enrolled", progress=0)
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)
    enrollment = (
        db.query(Enrollment)
        .options(joinedload(Enrollment.course))
        .filter(Enrollment.id == enrollment.id)
        .one()
    )
    return enrollment


@router.post("/me/lessons/{lesson_id}/complete", status_code=status.HTTP_200_OK)
def complete_lesson(
    lesson_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, int | bool]:
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

    enrollment = _require_enrollment(db, current_user, course.id)

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
    db.commit()
    return {"completed": True, "progress": enrollment.progress}


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

    block = quiz.blocks[0] if quiz.blocks else None
    if block is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quiz is not attached to a lesson")

    lesson = db.query(Lesson).options(joinedload(Lesson.chapter)).filter(Lesson.id == block.lesson_id).first()
    if lesson is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")

    course_id = lesson.chapter.course_id
    course = db.query(Course).filter(Course.id == course_id).first()
    if course is None or course.status != "published":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    _require_enrollment(db, current_user, course_id)

    score, _, _ = _score_answers(quiz.questions, payload.answers)
    passed = score >= course.pass_percent
    attempt = QuizAttempt(
        user_id=current_user.id,
        quiz_id=quiz.id,
        score=score,
        passed=passed,
        answers_json=json.dumps(payload.answers),
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    return QuizAttemptOut(id=attempt.id, score=attempt.score, passed=attempt.passed, certificate_code=None)


@router.post("/me/courses/{course_id}/final-exam/submit", response_model=QuizAttemptOut)
def submit_final_exam(
    course_id: int,
    payload: QuizSubmitIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> QuizAttemptOut:
    course = _load_published_course(db, course_id)
    _require_enrollment(db, current_user, course_id)

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
        existing = (
            db.query(Certificate)
            .filter(Certificate.user_id == current_user.id, Certificate.course_id == course_id)
            .first()
        )
        if existing is None:
            certificate_code = f"CAISBE-{course.code}-{secrets.token_hex(4).upper()}"
            db.add(
                Certificate(
                    user_id=current_user.id,
                    course_id=course_id,
                    certificate_code=certificate_code,
                )
            )
        else:
            certificate_code = existing.certificate_code

        enrollment = _require_enrollment(db, current_user, course_id)
        enrollment.status = "completed"
        enrollment.progress = 100

    db.commit()
    db.refresh(attempt)
    return QuizAttemptOut(
        id=attempt.id,
        score=attempt.score,
        passed=attempt.passed,
        certificate_code=certificate_code,
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
    results: list[CertificateOut] = []
    for row in rows:
        template = row.course.certificate_template
        title = template.title if template else "Certificate of Completion"
        body_template = (
            template.body
            if template
            else "This certifies that {student_name} has successfully completed {course_title}."
        )
        body = body_template.format(student_name=current_user.full_name, course_title=row.course.title)
        results.append(
            CertificateOut(
                id=row.id,
                certificate_code=row.certificate_code,
                issued_at=row.issued_at,
                course=CourseOut.model_validate(row.course),
                student_name=current_user.full_name,
                title=title,
                body=body,
            )
        )
    return results


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

    template = row.course.certificate_template
    title = template.title if template else "Certificate of Completion"
    body_template = (
        template.body
        if template
        else "This certifies that {student_name} has successfully completed {course_title}."
    )
    body = body_template.format(student_name=current_user.full_name, course_title=row.course.title)
    return CertificateOut(
        id=row.id,
        certificate_code=row.certificate_code,
        issued_at=row.issued_at,
        course=CourseOut.model_validate(row.course),
        student_name=current_user.full_name,
        title=title,
        body=body,
    )

"""Course certificates and exam unlock require quizzes and graded assignments."""

from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import (
    AssignmentSubmission,
    Chapter,
    ContentBlock,
    Course,
    Enrollment,
    FinalExam,
    Lesson,
    LessonProgress,
    Notification,
    Quiz,
    QuizAttempt,
    QuizChoice,
    QuizQuestion,
    User,
)
from app.security.auth import hash_password

STRONG_PASSWORD = "Str0ng-Password!99"


def _student(db: Session, email: str) -> User:
    user = User(
        full_name="Learner",
        email=email,
        phone="+15555550111",
        country="Canada",
        city="Toronto",
        hashed_password=hash_password(STRONG_PASSWORD),
        role="student",
        membership_type="student",
        membership_status="active",
        membership_date=datetime.now(timezone.utc),
        email_verified_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _login(client: TestClient, email: str) -> dict[str, str]:
    response = client.post("/api/auth/login", json={"email": email, "password": STRONG_PASSWORD})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def _course_with_work(db: Session) -> tuple[Course, Lesson, Quiz, ContentBlock, FinalExam]:
    course = Course(
        code="WRK-1",
        title="Work Course",
        description="Topics, quiz, assignment, exam.",
        slug="wrk-1",
        status="published",
        pass_percent=70,
        price_cents=1000,
    )
    db.add(course)
    db.flush()
    chapter = Chapter(course_id=course.id, title="Chapter 1", sort_order=0)
    db.add(chapter)
    db.flush()
    lesson = Lesson(chapter_id=chapter.id, title="Topic 1", body="Notes", sort_order=0)
    db.add(lesson)
    db.flush()
    quiz = Quiz(title="Chapter quiz")
    db.add(quiz)
    db.flush()
    question = QuizQuestion(quiz_id=quiz.id, prompt="2+2?", sort_order=0)
    db.add(question)
    db.flush()
    db.add(QuizChoice(question_id=question.id, text="3", is_correct=False, sort_order=0))
    db.add(QuizChoice(question_id=question.id, text="4", is_correct=True, sort_order=1))
    db.add(
        ContentBlock(
            chapter_id=chapter.id,
            block_type="quiz",
            title="Quiz block",
            quiz_id=quiz.id,
            sort_order=0,
        )
    )
    assignment = ContentBlock(
        chapter_id=chapter.id,
        block_type="assignment",
        title="Assignment",
        body="Submit work.",
        sort_order=1,
        points_possible=100,
    )
    db.add(assignment)
    exam = FinalExam(
        course_id=course.id,
        title="Final",
        pass_percent=70,
        secure_mode=False,
        exam_wait_days=0,
    )
    db.add(exam)
    db.flush()
    exam_q = QuizQuestion(final_exam_id=exam.id, prompt="Exam?", sort_order=0)
    db.add(exam_q)
    db.flush()
    db.add(QuizChoice(question_id=exam_q.id, text="Yes", is_correct=True, sort_order=0))
    db.add(QuizChoice(question_id=exam_q.id, text="No", is_correct=False, sort_order=1))
    db.commit()
    db.refresh(course)
    db.refresh(lesson)
    db.refresh(quiz)
    db.refresh(assignment)
    db.refresh(exam)
    return course, lesson, quiz, assignment, exam


def test_quiz_uses_course_pass_percent_and_allows_retry(client: TestClient, db: Session) -> None:
    student = _student(db, "quiz-pass@example.com")
    course, _lesson, quiz, _assignment, _exam = _course_with_work(db)
    db.add(Enrollment(user_id=student.id, course_id=course.id, status="enrolled", progress=0))
    db.commit()
    headers = _login(client, student.email)

    question = (
        db.query(QuizQuestion)
        .filter(QuizQuestion.quiz_id == quiz.id)
        .one()
    )
    choices = db.query(QuizChoice).filter(QuizChoice.question_id == question.id).all()
    wrong = next(choice for choice in choices if not choice.is_correct)
    right = next(choice for choice in choices if choice.is_correct)

    failed = client.post(
        f"/api/me/quizzes/{quiz.id}/submit",
        headers=headers,
        json={"answers": {str(question.id): wrong.id}},
    )
    assert failed.status_code == 200, failed.text
    assert failed.json()["passed"] is False
    assert failed.json()["score"] == 0

    retry = client.post(
        f"/api/me/quizzes/{quiz.id}/submit",
        headers=headers,
        json={"answers": {str(question.id): right.id}},
    )
    assert retry.status_code == 200, retry.text
    assert retry.json()["passed"] is True
    assert retry.json()["score"] == 100

    latest = client.get(f"/api/me/quizzes/{quiz.id}/latest", headers=headers)
    assert latest.status_code == 200
    assert latest.json()["passed"] is True


def test_exam_blocked_until_quiz_and_assignment_passed(client: TestClient, db: Session) -> None:
    student = _student(db, "exam-gate@example.com")
    course, lesson, quiz, assignment, exam = _course_with_work(db)
    db.add(
        Enrollment(
            user_id=student.id,
            course_id=course.id,
            status="enrolled",
            progress=0,
            exam_access="allowed",
        )
    )
    db.commit()
    headers = _login(client, student.email)

    db.add(LessonProgress(user_id=student.id, lesson_id=lesson.id))
    db.commit()

    blocked = client.post(f"/api/me/courses/{course.id}/final-exam/start", headers=headers)
    assert blocked.status_code == 400
    assert "quiz" in blocked.json()["detail"].lower()

    question = db.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz.id).one()
    right = (
        db.query(QuizChoice)
        .filter(QuizChoice.question_id == question.id, QuizChoice.is_correct.is_(True))
        .one()
    )
    db.add(
        QuizAttempt(
            user_id=student.id,
            quiz_id=quiz.id,
            score=100,
            passed=True,
            answers_json=f'{{"{question.id}": {right.id}}}',
        )
    )
    db.commit()

    still = client.post(f"/api/me/courses/{course.id}/final-exam/start", headers=headers)
    assert still.status_code == 400
    assert "assignment" in still.json()["detail"].lower()

    db.add(
        AssignmentSubmission(
            user_id=student.id,
            content_block_id=assignment.id,
            body="Done",
            status="passed",
            score=100,
        )
    )
    db.commit()

    started = client.post(f"/api/me/courses/{course.id}/final-exam/start", headers=headers)
    assert started.status_code == 200, started.text
    assert started.json()["secure_mode"] is False


def test_certificate_requires_passed_assignment(client: TestClient, db: Session) -> None:
    student = _student(db, "cert-assign@example.com")
    course, lesson, quiz, assignment, exam = _course_with_work(db)
    db.add(Enrollment(user_id=student.id, course_id=course.id, status="enrolled", progress=0))
    db.add(LessonProgress(user_id=student.id, lesson_id=lesson.id))
    question = db.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz.id).one()
    right = (
        db.query(QuizChoice)
        .filter(QuizChoice.question_id == question.id, QuizChoice.is_correct.is_(True))
        .one()
    )
    db.add(
        QuizAttempt(
            user_id=student.id,
            quiz_id=quiz.id,
            score=100,
            passed=True,
            answers_json=f'{{"{question.id}": {right.id}}}',
        )
    )
    db.add(
        AssignmentSubmission(
            user_id=student.id,
            content_block_id=assignment.id,
            body="Done",
            status="under_review",
        )
    )
    db.add(
        QuizAttempt(
            user_id=student.id,
            final_exam_id=exam.id,
            score=100,
            passed=True,
            answers_json="{}",
        )
    )
    db.commit()
    headers = _login(client, student.email)

    detail = client.get(f"/api/courses/{course.id}", headers=headers)
    assert detail.status_code == 200
    assert detail.json()["certificate_code"] is None

    # Completing a lesson triggers progress recompute / finalize check.
    client.post(f"/api/me/lessons/{lesson.id}/complete", headers=headers)
    detail = client.get(f"/api/courses/{course.id}", headers=headers)
    assert detail.json()["certificate_code"] is None

    submission = (
        db.query(AssignmentSubmission)
        .filter(
            AssignmentSubmission.user_id == student.id,
            AssignmentSubmission.content_block_id == assignment.id,
        )
        .one()
    )
    submission.status = "passed"
    submission.score = 100
    db.commit()

    client.post(f"/api/me/lessons/{lesson.id}/complete", headers=headers)
    issued = client.get(f"/api/courses/{course.id}", headers=headers)
    assert issued.status_code == 200
    assert issued.json()["certificate_code"]


def test_course_work_complete_notifies_admins_once(client: TestClient, db: Session) -> None:
    admin = User(
        full_name="Exam Admin",
        email="exam-notify-admin@example.com",
        phone="+15555550999",
        country="Canada",
        city="Toronto",
        hashed_password=hash_password(STRONG_PASSWORD),
        role="admin",
        membership_status="active",
        email_verified_at=datetime.now(timezone.utc),
    )
    db.add(admin)
    student = _student(db, "exam-notify-student@example.com")
    course, lesson, quiz, assignment, _exam = _course_with_work(db)
    db.add(
        Enrollment(
            user_id=student.id,
            course_id=course.id,
            status="enrolled",
            progress=0,
            exam_access="restricted",
        )
    )
    question = db.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz.id).one()
    right = (
        db.query(QuizChoice)
        .filter(QuizChoice.question_id == question.id, QuizChoice.is_correct.is_(True))
        .one()
    )
    db.add(LessonProgress(user_id=student.id, lesson_id=lesson.id))
    db.add(
        QuizAttempt(
            user_id=student.id,
            quiz_id=quiz.id,
            score=100,
            passed=True,
            answers_json=f'{{"{question.id}": {right.id}}}',
        )
    )
    db.add(
        AssignmentSubmission(
            user_id=student.id,
            content_block_id=assignment.id,
            body="Done",
            status="passed",
            score=100,
        )
    )
    db.commit()
    headers = _login(client, student.email)

    with patch("app.services.exam_access_request_admin_email.send_email") as send:
        first = client.post(f"/api/me/lessons/{lesson.id}/complete", headers=headers)
        assert first.status_code == 200, first.text
        assert send.call_count == 1
        assert send.call_args.kwargs["to"] == admin.email
        assert "Exam access requested" in send.call_args.kwargs["subject"]
        assert course.title in send.call_args.kwargs["html_body"]

        second = client.post(f"/api/me/lessons/{lesson.id}/complete", headers=headers)
        assert second.status_code == 200
        assert send.call_count == 1

    enrollment = (
        db.query(Enrollment)
        .filter(Enrollment.user_id == student.id, Enrollment.course_id == course.id)
        .one()
    )
    assert enrollment.exam_access_requested_at is not None
    notice = (
        db.query(Notification)
        .filter(Notification.user_id == admin.id, Notification.kind == "access")
        .filter(Notification.title == "Exam access requested")
        .one()
    )
    assert notice.link == "/access-control"

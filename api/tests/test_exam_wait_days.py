"""Minimum enrollment days before a student may sit the final exam."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import (
    Chapter,
    Course,
    Enrollment,
    FinalExam,
    QuizChoice,
    QuizQuestion,
    User,
)
from app.security.auth import hash_password

STRONG_PASSWORD = "Str0ng-Password!99"


def _user(db: Session, email: str) -> User:
    user = User(
        full_name="Wait Learner",
        email=email,
        phone="+15555550122",
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


def _course_with_exam(db: Session, *, wait_days: int) -> tuple[Course, FinalExam]:
    course = Course(
        code="WAIT-101",
        title="Wait Course",
        description="Reading period course",
        slug="wait-course",
        status="published",
        pass_percent=70,
        price_cents=1000,
    )
    db.add(course)
    db.flush()
    db.add(Chapter(course_id=course.id, title="Ch 1", sort_order=0))
    exam = FinalExam(
        course_id=course.id,
        title="Final",
        pass_percent=70,
        secure_mode=False,
        exam_wait_days=wait_days,
    )
    db.add(exam)
    db.flush()
    question = QuizQuestion(final_exam_id=exam.id, prompt="Ready?", sort_order=0)
    db.add(question)
    db.flush()
    db.add(QuizChoice(question_id=question.id, text="Yes", is_correct=True, sort_order=0))
    db.add(QuizChoice(question_id=question.id, text="No", is_correct=False, sort_order=1))
    db.commit()
    db.refresh(course)
    db.refresh(exam)
    return course, exam


def _enroll(
    db: Session,
    user: User,
    course: Course,
    *,
    enrolled_at: datetime | None = None,
) -> Enrollment:
    row = Enrollment(
        user_id=user.id,
        course_id=course.id,
        status="enrolled",
        progress=100,
        exam_access="allowed",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    if enrolled_at is not None:
        row.enrolled_at = enrolled_at
        db.commit()
        db.refresh(row)
    return row


def _login(client: TestClient, email: str) -> dict[str, str]:
    response = client.post("/api/auth/login", json={"email": email, "password": STRONG_PASSWORD})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_exam_wait_blocks_until_period_elapsed(client: TestClient, db: Session) -> None:
    student = _user(db, "wait-block@example.com")
    course, _exam = _course_with_exam(db, wait_days=30)
    _enroll(db, student, course, enrolled_at=datetime.now(timezone.utc))
    headers = _login(client, student.email)

    blocked = client.post(f"/api/me/courses/{course.id}/final-exam/start", headers=headers)
    assert blocked.status_code == 403, blocked.text
    detail = blocked.json()["detail"].lower()
    assert "unlocks after 30 day" in detail
    assert "remaining" in detail

    precheck = client.post(
        f"/api/me/courses/{course.id}/final-exam/precheck",
        headers=headers,
        json={
            "rules_accepted": True,
            "fullscreen_ok": True,
            "visibility_api_ok": True,
            "camera_ok": True,
        },
    )
    assert precheck.status_code == 403

    detail_res = client.get(f"/api/courses/{course.id}", headers=headers)
    assert detail_res.status_code == 200, detail_res.text
    body = detail_res.json()
    assert body["exam_wait_days_remaining"] is not None
    assert body["exam_wait_days_remaining"] >= 1
    assert body["final_exam"]["exam_wait_days"] == 30


def test_exam_wait_allows_after_period(client: TestClient, db: Session) -> None:
    student = _user(db, "wait-ok@example.com")
    course, _exam = _course_with_exam(db, wait_days=30)
    _enroll(
        db,
        student,
        course,
        enrolled_at=datetime.now(timezone.utc) - timedelta(days=31),
    )
    headers = _login(client, student.email)

    started = client.post(f"/api/me/courses/{course.id}/final-exam/start", headers=headers)
    assert started.status_code == 200, started.text
    assert started.json()["in_progress"] is True

    detail_res = client.get(f"/api/courses/{course.id}", headers=headers)
    assert detail_res.status_code == 200
    assert detail_res.json()["exam_wait_days_remaining"] == 0


def test_exam_wait_zero_skips_calendar_gate(client: TestClient, db: Session) -> None:
    student = _user(db, "wait-zero@example.com")
    course, _exam = _course_with_exam(db, wait_days=0)
    _enroll(db, student, course, enrolled_at=datetime.now(timezone.utc))
    headers = _login(client, student.email)

    started = client.post(f"/api/me/courses/{course.id}/final-exam/start", headers=headers)
    assert started.status_code == 200, started.text
    assert started.json()["in_progress"] is True

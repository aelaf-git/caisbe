"""Existing students can buy another course, and a certificate does not close the course."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Certificate, Chapter, Course, Enrollment, Lesson, User
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


def _course(db: Session, code: str) -> Course:
    course = Course(
        code=code,
        title=f"Course {code}",
        description="A published program.",
        slug=code.lower(),
        status="published",
        pass_percent=70,
        price_cents=2500,
    )
    db.add(course)
    db.flush()
    chapter = Chapter(course_id=course.id, title=f"Chapter {code}", sort_order=0)
    db.add(chapter)
    db.flush()
    db.add(Lesson(chapter_id=chapter.id, title=f"Topic {code}", body="Lecture notes", sort_order=0))
    db.commit()
    db.refresh(course)
    return course


def _login(client: TestClient, email: str) -> dict[str, str]:
    response = client.post("/api/auth/login", json={"email": email, "password": STRONG_PASSWORD})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_enrolled_student_can_buy_a_second_course(client: TestClient, db: Session) -> None:
    student = _student(db, "more-courses@example.com")
    first = _course(db, "EXT-A")
    second = _course(db, "EXT-B")
    db.add(Enrollment(user_id=student.id, course_id=first.id, status="enrolled", progress=10))
    db.commit()
    headers = _login(client, student.email)

    added = client.post("/api/me/cart", headers=headers, json={"course_id": second.id})
    assert added.status_code == 201

    bought = client.post("/api/me/checkout", headers=headers, json={"from_cart": True})
    assert bought.status_code == 200

    owned = {
        row.course_id
        for row in db.query(Enrollment)
        .filter(Enrollment.user_id == student.id, Enrollment.status.in_(("enrolled", "completed")))
        .all()
    }
    assert owned == {first.id, second.id}

    again = client.post("/api/me/cart", headers=headers, json={"course_id": first.id})
    assert again.status_code == 400
    assert "already enrolled" in again.json()["detail"].lower()


def test_certificate_does_not_close_course_materials(client: TestClient, db: Session) -> None:
    student = _student(db, "completed-course@example.com")
    course = _course(db, "EXT-C")
    db.add(Enrollment(user_id=student.id, course_id=course.id, status="completed", progress=100))
    db.add(
        Certificate(
            user_id=student.id,
            course_id=course.id,
            certificate_code="CAISBE-EXT-C-TEST",
        )
    )
    db.commit()

    detail = client.get(f"/api/courses/{course.id}", headers=_login(client, student.email))
    assert detail.status_code == 200
    body = detail.json()
    assert body["certificate_code"] == "CAISBE-EXT-C-TEST"
    assert body["chapters"][0]["title"] == "Chapter EXT-C"
    assert body["chapters"][0]["lessons"][0]["title"] == "Topic EXT-C"
    assert "Lecture notes" in (body["chapters"][0]["lessons"][0]["body"] or "")

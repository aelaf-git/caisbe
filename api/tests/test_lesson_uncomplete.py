"""Students can clear a topic completed mark."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Chapter, Course, Enrollment, Lesson, LessonProgress, User
from app.security.auth import hash_password

STRONG_PASSWORD = "Str0ng-Password!99"


def test_uncomplete_lesson(client: TestClient, db: Session) -> None:
    user = User(
        full_name="Learner",
        email="unmark@example.com",
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
    db.flush()
    course = Course(
        code="UNM-1",
        title="Unmark Course",
        description="Desc",
        slug="unmark-course",
        status="published",
        pass_percent=70,
    )
    db.add(course)
    db.flush()
    chapter = Chapter(course_id=course.id, title="Ch 1", sort_order=0)
    db.add(chapter)
    db.flush()
    lesson = Lesson(chapter_id=chapter.id, title="Topic 1", sort_order=0)
    db.add(lesson)
    db.add(Enrollment(user_id=user.id, course_id=course.id, status="enrolled", progress=0))
    db.commit()
    db.refresh(lesson)

    login = client.post("/api/auth/login", json={"email": user.email, "password": STRONG_PASSWORD})
    assert login.status_code == 200
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    done = client.post(f"/api/me/lessons/{lesson.id}/complete", headers=headers)
    assert done.status_code == 200
    assert done.json()["completed"] is True
    assert db.query(LessonProgress).filter(LessonProgress.lesson_id == lesson.id).count() == 1

    undone = client.delete(f"/api/me/lessons/{lesson.id}/complete", headers=headers)
    assert undone.status_code == 200
    assert undone.json()["completed"] is False
    assert db.query(LessonProgress).filter(LessonProgress.lesson_id == lesson.id).count() == 0

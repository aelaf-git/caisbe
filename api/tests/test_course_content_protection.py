"""Per-course content_protection flag for portal lockdown."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Course, Enrollment, User
from app.security.auth import hash_password

STRONG_PASSWORD = "Str0ng-Password!99"


def _admin(db: Session) -> User:
    user = User(
        full_name="Admin",
        email="admin-protect@example.com",
        phone="+15555550999",
        country="Canada",
        city="Toronto",
        hashed_password=hash_password(STRONG_PASSWORD),
        role="admin",
        membership_status="active",
        email_verified_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _student(db: Session) -> User:
    user = User(
        full_name="Student",
        email="student-protect@example.com",
        phone="+15555550100",
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


def _login(client: TestClient, email: str) -> str:
    response = client.post("/api/auth/login", json={"email": email, "password": STRONG_PASSWORD})
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def test_new_course_defaults_content_protection_on(client: TestClient, db: Session) -> None:
    admin = _admin(db)
    token = _login(client, admin.email)
    created = client.post(
        "/api/admin/courses",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "code": "PROT-1",
            "title": "Protected Course",
            "description": "Desc",
            "slug": "protected-course",
        },
    )
    assert created.status_code in (200, 201), created.text
    body = created.json()
    assert body["content_protection"] is True
    course = db.query(Course).filter(Course.id == body["id"]).one()
    assert course.content_protection is True


def test_admin_can_toggle_content_protection(client: TestClient, db: Session) -> None:
    admin = _admin(db)
    token = _login(client, admin.email)
    created = client.post(
        "/api/admin/courses",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "code": "PROT-2",
            "title": "Toggle Course",
            "description": "Desc",
            "slug": "toggle-course",
        },
    )
    course_id = created.json()["id"]

    # Publish so meta edits normally go to draft — content_protection must still apply live.
    pub = client.patch(
        f"/api/admin/courses/{course_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"status": "published"},
    )
    # May fail publish validation if empty content — set status via db if needed.
    if pub.status_code != 200:
        course = db.query(Course).filter(Course.id == course_id).one()
        course.status = "published"
        db.commit()

    patched = client.patch(
        f"/api/admin/courses/{course_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"content_protection": False},
    )
    assert patched.status_code == 200, patched.text
    assert patched.json()["content_protection"] is False

    db.expire_all()
    course = db.query(Course).filter(Course.id == course_id).one()
    assert course.content_protection is False


def test_student_course_detail_includes_flag(client: TestClient, db: Session) -> None:
    admin = _admin(db)
    student = _student(db)
    admin_token = _login(client, admin.email)
    created = client.post(
        "/api/admin/courses",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "code": "PROT-3",
            "title": "Student Flag Course",
            "description": "Desc",
            "slug": "student-flag-course",
            "content_protection": True,
        },
    )
    assert created.status_code in (200, 201), created.text
    course_id = created.json()["id"]
    course = db.query(Course).filter(Course.id == course_id).one()
    course.status = "published"
    db.add(Enrollment(user_id=student.id, course_id=course_id, status="enrolled", progress=0))
    db.commit()

    student_token = _login(client, student.email)
    detail = client.get(
        f"/api/courses/{course_id}",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert detail.status_code == 200, detail.text
    assert detail.json()["content_protection"] is True

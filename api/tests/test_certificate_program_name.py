"""Certificate program line follows the course title, or a manual name."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Certificate, Course, Enrollment, User
from app.security.auth import hash_password

STRONG_PASSWORD = "Str0ng-Password!99"
CERTIFICATE_CODE = "CAISBE-RE-EDU-TEST"


def _user(db: Session, email: str, role: str) -> User:
    user = User(
        full_name="Amina Bekele" if role == "student" else "Admin",
        email=email,
        phone="+15555550111",
        country="Canada",
        city="Toronto",
        hashed_password=hash_password(STRONG_PASSWORD),
        role=role,
        membership_type="student" if role == "student" else None,
        membership_status="active",
        membership_date=datetime.now(timezone.utc) if role == "student" else None,
        email_verified_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _login(client: TestClient, email: str) -> dict[str, str]:
    response = client.post("/api/auth/login", json={"email": email, "password": STRONG_PASSWORD})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_certificate_program_name_is_automatic_or_manual(client: TestClient, db: Session) -> None:
    admin = _user(db, "cert-name-admin@example.com", "admin")
    student = _user(db, "cert-name-student@example.com", "student")
    course = Course(
        code="RE-EDU",
        title="Real Estate Course",
        description="A published program.",
        slug="real-estate-course",
        status="published",
    )
    db.add(course)
    db.flush()
    db.add(Enrollment(user_id=student.id, course_id=course.id, status="completed", progress=100))
    db.add(
        Certificate(
            user_id=student.id,
            course_id=course.id,
            certificate_code=CERTIFICATE_CODE,
        )
    )
    db.commit()

    student_headers = _login(client, student.email)
    admin_headers = _login(client, admin.email)

    def printed_name() -> str:
        detail = client.get(f"/api/me/certificates/{CERTIFICATE_CODE}", headers=student_headers)
        assert detail.status_code == 200, detail.text
        verify = client.get(f"/api/certificates/verify/{CERTIFICATE_CODE}")
        assert verify.status_code == 200, verify.text
        assert verify.json()["course_title"] == detail.json()["program_name"]
        assert detail.json()["course"]["title"] == "Real Estate Course"
        assert "Real Estate" in detail.json()["body"]
        return detail.json()["program_name"]

    assert printed_name() == "Real Estate Course"

    updated = client.put(
        f"/api/admin/courses/{course.id}/certificate-template",
        headers=admin_headers,
        json={"program_name": "Real Estate Education"},
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["program_name"] == "Real Estate Education"
    assert printed_name() == "Real Estate Education"
    assert (
        db.query(Certificate).filter(Certificate.certificate_code == CERTIFICATE_CODE).count() == 1
    )

    cleared = client.put(
        f"/api/admin/courses/{course.id}/certificate-template",
        headers=admin_headers,
        json={"program_name": ""},
    )
    assert cleared.status_code == 200, cleared.text
    assert cleared.json()["program_name"] is None
    assert printed_name() == "Real Estate Course"

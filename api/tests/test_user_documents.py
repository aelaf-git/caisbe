"""Student supporting documents on manage profile."""

from __future__ import annotations

from datetime import datetime, timezone
from io import BytesIO

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import User, UserDocument
from app.security.auth import hash_password

STRONG_PASSWORD = "Str0ng-Password!99"


def _make_student(db: Session, email: str = "docs@example.com") -> User:
    user = User(
        full_name="Doc Student",
        email=email,
        phone="+15555550111",
        country="Canada",
        city="Ottawa",
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


def _make_admin(db: Session) -> User:
    admin = User(
        full_name="Admin User",
        email="admin-docs@example.com",
        phone="+15555550999",
        country="Canada",
        city="Toronto",
        hashed_password=hash_password(STRONG_PASSWORD),
        role="admin",
        membership_status="active",
        email_verified_at=datetime.now(timezone.utc),
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin


def _login(client: TestClient, email: str) -> str:
    response = client.post("/api/auth/login", json={"email": email, "password": STRONG_PASSWORD})
    assert response.status_code == 200
    return response.json()["access_token"]


def test_student_can_upload_list_and_delete_documents(client: TestClient, db: Session) -> None:
    user = _make_student(db)
    token = _login(client, user.email)
    headers = {"Authorization": f"Bearer {token}"}

    empty = client.get("/api/me/documents", headers=headers)
    assert empty.status_code == 200
    assert empty.json() == []

    upload = client.post(
        "/api/me/documents",
        headers=headers,
        files={"file": ("resume.pdf", BytesIO(b"%PDF-1.4 fake"), "application/pdf")},
        data={"label": "Resume"},
    )
    assert upload.status_code == 201
    body = upload.json()
    assert body["file_name"] == "resume.pdf"
    assert body["label"] == "Resume"
    assert body["file_url"]
    doc_id = body["id"]

    listed = client.get("/api/me/documents", headers=headers)
    assert listed.status_code == 200
    assert len(listed.json()) == 1
    assert listed.json()[0]["id"] == doc_id

    second = client.post(
        "/api/me/documents",
        headers=headers,
        files={"file": ("id.png", BytesIO(b"\x89PNG\r\n\x1a\n"), "image/png")},
    )
    assert second.status_code == 201
    assert len(client.get("/api/me/documents", headers=headers).json()) == 2

    deleted = client.delete(f"/api/me/documents/{doc_id}", headers=headers)
    assert deleted.status_code == 204
    remaining = client.get("/api/me/documents", headers=headers).json()
    assert len(remaining) == 1
    assert remaining[0]["file_name"] == "id.png"


def test_admin_can_view_student_documents(client: TestClient, db: Session) -> None:
    student = _make_student(db, email="student-docs@example.com")
    admin = _make_admin(db)
    db.add(
        UserDocument(
            user_id=student.id,
            label="Transcript",
            file_name="transcript.pdf",
            file_url="/api/uploads/profile/supporting/abc.pdf",
        )
    )
    db.commit()

    admin_token = _login(client, admin.email)
    response = client.get(
        f"/api/admin/students/{student.id}/documents",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    rows = response.json()
    assert len(rows) == 1
    assert rows[0]["file_name"] == "transcript.pdf"
    assert rows[0]["label"] == "Transcript"


def test_student_cannot_delete_another_users_document(client: TestClient, db: Session) -> None:
    owner = _make_student(db, email="owner@example.com")
    other = _make_student(db, email="other@example.com")
    doc = UserDocument(
        user_id=owner.id,
        label="Private",
        file_name="private.pdf",
        file_url="/api/uploads/profile/supporting/private.pdf",
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    other_token = _login(client, other.email)
    response = client.delete(
        f"/api/me/documents/{doc.id}",
        headers={"Authorization": f"Bearer {other_token}"},
    )
    assert response.status_code == 404
    assert db.query(UserDocument).filter(UserDocument.id == doc.id).first() is not None

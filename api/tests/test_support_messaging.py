"""Student–admin support messaging isolation and reply flow."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import SupportMessage, SupportThread, User
from app.security.auth import hash_password

STRONG_PASSWORD = "Str0ng-Password!99"


def _user(db: Session, *, email: str, role: str, name: str) -> User:
    user = User(
        full_name=name,
        email=email,
        phone="+15555550100",
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


def _login(client: TestClient, email: str) -> str:
    response = client.post("/api/auth/login", json={"email": email, "password": STRONG_PASSWORD})
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def test_student_thread_isolated_and_admin_can_reply(client: TestClient, db: Session) -> None:
    student_a = _user(db, email="a-support@example.com", role="student", name="Student A")
    student_b = _user(db, email="b-support@example.com", role="student", name="Student B")
    admin = _user(db, email="admin-support@example.com", role="admin", name="Admin")

    token_a = _login(client, student_a.email)
    token_b = _login(client, student_b.email)
    admin_token = _login(client, admin.email)

    created = client.post(
        "/api/me/support/threads",
        headers={"Authorization": f"Bearer {token_a}"},
        json={
            "subject": "Course access issue",
            "kind": "issue",
            "body": "I cannot open my course.",
        },
    )
    assert created.status_code == 201, created.text
    thread_id = created.json()["id"]
    assert created.json()["kind"] == "issue"
    assert len(created.json()["messages"]) == 1

    # Student B cannot see A's thread
    list_b = client.get("/api/me/support/threads", headers={"Authorization": f"Bearer {token_b}"})
    assert list_b.status_code == 200
    assert list_b.json() == []

    denied = client.get(
        f"/api/me/support/threads/{thread_id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert denied.status_code == 404

    # Admin sees thread and replies
    inbox = client.get("/api/admin/support/threads", headers={"Authorization": f"Bearer {admin_token}"})
    assert inbox.status_code == 200
    assert any(row["id"] == thread_id for row in inbox.json())

    reply = client.post(
        f"/api/admin/support/threads/{thread_id}/messages",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"body": "Thanks — we are looking into it."},
    )
    assert reply.status_code == 201, reply.text
    assert reply.json()["is_from_admin"] is True

    # Student polls new messages
    polled = client.get(
        f"/api/me/support/threads/{thread_id}/messages?after_id=0",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert polled.status_code == 200
    assert len(polled.json()) == 2
    assert polled.json()[-1]["body"].startswith("Thanks")

    unread = client.get("/api/me/support/unread", headers={"Authorization": f"Bearer {token_a}"})
    assert unread.status_code == 200
    assert unread.json()["unread_count"] >= 1

    read = client.post(
        f"/api/me/support/threads/{thread_id}/read",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert read.status_code == 200
    unread_after = client.get("/api/me/support/unread", headers={"Authorization": f"Bearer {token_a}"})
    assert unread_after.json()["unread_count"] == 0

    assert db.query(SupportThread).count() == 1
    assert db.query(SupportMessage).count() == 2


def test_closed_thread_rejects_student_reply(client: TestClient, db: Session) -> None:
    student = _user(db, email="c-support@example.com", role="student", name="Student C")
    admin = _user(db, email="admin2-support@example.com", role="admin", name="Admin 2")
    token = _login(client, student.email)
    admin_token = _login(client, admin.email)

    created = client.post(
        "/api/me/support/threads",
        headers={"Authorization": f"Bearer {token}"},
        json={"subject": "Quick question", "kind": "question", "body": "Hello"},
    )
    thread_id = created.json()["id"]

    closed = client.patch(
        f"/api/admin/support/threads/{thread_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"status": "closed"},
    )
    assert closed.status_code == 200
    assert closed.json()["status"] == "closed"

    blocked = client.post(
        f"/api/me/support/threads/{thread_id}/messages",
        headers={"Authorization": f"Bearer {token}"},
        json={"body": "Still need help"},
    )
    assert blocked.status_code == 400

"""Discussion forum boards, member posts, and admin moderation."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import User
from app.security.auth import hash_password
from app.seeds.forum import seed_forum

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


def test_forum_boards_posts_and_moderation(client: TestClient, db: Session) -> None:
    seed_forum(db)
    student = _user(db, email="forum-student@example.com", role="student", name="Amina Student")
    admin = _user(db, email="forum-admin@example.com", role="admin", name="Forum Admin")
    student_token = _login(client, student.email)
    admin_token = _login(client, admin.email)
    student_headers = {"Authorization": f"Bearer {student_token}"}
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    home = client.get("/api/forum/categories")
    assert home.status_code == 200, home.text
    titles = [row["title"] for row in home.json()]
    assert titles == [
        "All Students Forum",
        "Academic Support",
        "Career Development",
        "Events",
    ]
    announcements = next(
        board
        for category in home.json()
        if category["slug"] == "all-students-forum"
        for board in category["boards"]
        if board["slug"] == "announcements"
    )
    assert announcements["member_can_start"] is False
    assert announcements["last_thread_title"] is None

    assert client.get("/api/forum/boards/general-questions").status_code == 401

    blocked = client.post(
        "/api/forum/boards/announcements/threads",
        headers=student_headers,
        json={"title": "Hello everyone", "body": "A member announcement."},
    )
    assert blocked.status_code == 403

    created = client.post(
        "/api/forum/boards/general-questions/threads",
        headers=student_headers,
        json={"title": "How do I join a chapter?", "body": "Looking for the steps."},
    )
    assert created.status_code == 201, created.text
    thread_id = created.json()["id"]
    assert created.json()["author_name"] == "Amina Student"

    reply = client.post(
        f"/api/forum/threads/{thread_id}/replies",
        headers=student_headers,
        json={"body": "Check the membership page."},
    )
    assert reply.status_code == 201, reply.text

    assert client.get(f"/api/forum/threads/{thread_id}").status_code == 401

    public = client.get(f"/api/forum/threads/{thread_id}", headers=student_headers)
    assert public.status_code == 200
    assert len(public.json()["replies"]) == 1

    board = client.get("/api/forum/boards/general-questions", headers=student_headers)
    assert board.status_code == 200
    assert board.json()["threads"][0]["reply_count"] == 1

    directory = client.get("/api/forum/categories")
    general = next(
        item
        for category in directory.json()
        for item in category["boards"]
        if item["slug"] == "general-questions"
    )
    assert general["last_thread_title"] is None
    assert general["last_activity_at"] is not None
    assert general["thread_count"] == 1

    hidden = client.patch(
        f"/api/admin/forum/threads/{thread_id}",
        headers=admin_headers,
        json={"hidden": True, "locked": True},
    )
    assert hidden.status_code == 200, hidden.text
    assert hidden.json()["hidden"] is True
    assert hidden.json()["locked"] is True

    assert client.get(f"/api/forum/threads/{thread_id}").status_code == 401
    assert client.get(f"/api/forum/threads/{thread_id}", headers=student_headers).status_code == 404
    locked_reply = client.post(
        f"/api/forum/threads/{thread_id}/replies",
        headers=student_headers,
        json={"body": "Still here?"},
    )
    assert locked_reply.status_code == 404

    restored = client.patch(
        f"/api/admin/forum/threads/{thread_id}",
        headers=admin_headers,
        json={"hidden": False},
    )
    assert restored.status_code == 200
    still_locked = client.post(
        f"/api/forum/threads/{thread_id}/replies",
        headers=student_headers,
        json={"body": "Still here?"},
    )
    assert still_locked.status_code == 403

    announcement = client.post(
        "/api/admin/forum/boards/announcements/threads",
        headers=admin_headers,
        json={"title": "Welcome to the forum", "body": "Please introduce yourselves."},
    )
    assert announcement.status_code == 201, announcement.text
    assert announcement.json()["board_slug"] == "announcements"

    inbox = client.get("/api/admin/forum/threads?board_slug=announcements", headers=admin_headers)
    assert inbox.status_code == 200
    assert any(row["title"] == "Welcome to the forum" for row in inbox.json())


def test_forum_stores_markup_as_plain_text_and_requires_a_user(client: TestClient, db: Session) -> None:
    seed_forum(db)
    assert client.get("/api/forum/boards/general-questions").status_code == 401

    student = _user(db, email="forum-plain@example.com", role="student", name="Plain Text")
    headers = {"Authorization": f"Bearer {_login(client, student.email)}"}
    created = client.post(
        "/api/forum/boards/general-questions/threads",
        headers=headers,
        json={
            "title": "Is this safe? <script>alert(1)</script>",
            "body": "'; DROP TABLE forum_threads;-- <img src=x onerror=alert(1)>",
        },
    )
    assert created.status_code == 201, created.text
    payload = created.json()
    assert payload["title"] == "Is this safe? alert(1)"
    assert payload["body"] == "'; DROP TABLE forum_threads;--"
    assert "<" not in payload["title"]
    assert "<" not in payload["body"]

    detail = client.get(f"/api/forum/threads/{payload['id']}", headers=headers)
    assert detail.status_code == 200, detail.text
    assert detail.json()["body"] == payload["body"]
    assert client.get(f"/api/forum/threads/{payload['id']}").status_code == 401
    assert client.get("/api/forum/categories").status_code == 200

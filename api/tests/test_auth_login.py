"""API tests for login hardening (lockout, verification gate)."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import PendingRegistration, User
from app.security.auth import (
    LOGIN_MAX_FAILURES,
    hash_password,
    new_email_verify_token,
)


STRONG_PASSWORD = "Str0ng-Password!99"


def _make_user(db: Session, *, email: str = "student@example.com", password: str = STRONG_PASSWORD) -> User:
    user = User(
        full_name="Test Student",
        email=email,
        phone="+15555550100",
        country="Canada",
        city="Toronto",
        hashed_password=hash_password(password),
        role="student",
        membership_type="student",
        membership_status="active",
        membership_date=datetime.now(timezone.utc),
        email_verified_at=datetime.now(timezone.utc),
        failed_login_count=0,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def test_login_success(client: TestClient, db: Session) -> None:
    _make_user(db)
    response = client.post(
        "/api/auth/login",
        json={"email": "student@example.com", "password": STRONG_PASSWORD},
    )
    assert response.status_code == 200
    body = response.json()
    assert "access_token" in body
    assert body["user"]["email"] == "student@example.com"


def test_login_invalid_credentials(client: TestClient, db: Session) -> None:
    _make_user(db)
    response = client.post(
        "/api/auth/login",
        json={"email": "student@example.com", "password": "Wrong-Password!99"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"


def test_login_unknown_email_same_message(client: TestClient, db: Session) -> None:
    response = client.post(
        "/api/auth/login",
        json={"email": "nobody@example.com", "password": STRONG_PASSWORD},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"


def test_login_lockout_after_max_failures(client: TestClient, db: Session) -> None:
    user = _make_user(db)
    for _ in range(LOGIN_MAX_FAILURES):
        bad = client.post(
            "/api/auth/login",
            json={"email": "student@example.com", "password": "Wrong-Password!99"},
        )
        assert bad.status_code == 401

    db.refresh(user)
    assert user.login_locked_until is not None

    # Even the correct password is rejected while locked (generic message).
    locked = client.post(
        "/api/auth/login",
        json={"email": "student@example.com", "password": STRONG_PASSWORD},
    )
    assert locked.status_code == 401
    assert locked.json()["detail"] == "Invalid email or password"


def test_login_clears_failures_on_success(client: TestClient, db: Session) -> None:
    user = _make_user(db)
    client.post(
        "/api/auth/login",
        json={"email": "student@example.com", "password": "Wrong-Password!99"},
    )
    db.refresh(user)
    assert user.failed_login_count == 1

    ok = client.post(
        "/api/auth/login",
        json={"email": "student@example.com", "password": STRONG_PASSWORD},
    )
    assert ok.status_code == 200
    db.refresh(user)
    assert user.failed_login_count == 0
    assert user.login_locked_until is None


def test_login_pending_registration_asks_to_verify(client: TestClient, db: Session) -> None:
    raw, token_hash = new_email_verify_token()
    db.add(
        PendingRegistration(
            email="pending@example.com",
            full_name="Pending Student",
            phone="+15555550101",
            country="Canada",
            city="Ottawa",
            hashed_password=hash_password(STRONG_PASSWORD),
            membership_type="student",
            token_hash=token_hash,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=72),
        )
    )
    db.commit()

    response = client.post(
        "/api/auth/login",
        json={"email": "pending@example.com", "password": STRONG_PASSWORD},
    )
    assert response.status_code == 403
    assert "verify your email" in response.json()["detail"].lower()
    assert raw  # token generated for the pending row


def test_forgot_password_generic_message(client: TestClient, db: Session) -> None:
    _make_user(db)
    known = client.post("/api/auth/forgot-password", json={"email": "student@example.com"})
    unknown = client.post("/api/auth/forgot-password", json={"email": "ghost@example.com"})
    assert known.status_code == 200
    assert unknown.status_code == 200
    assert known.json()["message"] == unknown.json()["message"]

"""Forgot-password / reset-password / change-password flows."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import PasswordResetToken, PendingRegistration, User
from app.security.auth import (
    LOGIN_MAX_FAILURES,
    hash_password,
    hash_password_reset_token,
    new_email_verify_token,
    new_password_reset_token,
    verify_password,
)
from app.services.password_reset_email import portal_reset_password_url

STRONG_PASSWORD = "Str0ng-Password!99"
NEW_PASSWORD = "N3w-Secure-Pass!42"


def _make_user(
    db: Session,
    *,
    email: str = "student@example.com",
    password: str = STRONG_PASSWORD,
    verified: bool = True,
) -> User:
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
        email_verified_at=datetime.now(timezone.utc) if verified else None,
        failed_login_count=0,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def test_portal_reset_url_includes_token() -> None:
    url = portal_reset_password_url("abcToken123")
    assert "/auth/reset-password?token=" in url
    assert "abcToken123" in url


def test_forgot_password_creates_token_and_sends_email(client: TestClient, db: Session) -> None:
    user = _make_user(db)
    with patch("app.routers.auth.send_password_reset_email") as send_mail:
        response = client.post(
            "/api/auth/forgot-password",
            json={"email": "student@example.com"},
        )
    assert response.status_code == 200
    assert "account exists" in response.json()["message"].lower()
    send_mail.assert_called_once()
    kwargs = send_mail.call_args.kwargs
    assert kwargs["to"] == "student@example.com"
    assert kwargs["raw_token"]
    rows = db.query(PasswordResetToken).filter(PasswordResetToken.user_id == user.id).all()
    assert len(rows) == 1
    assert rows[0].token_hash == hash_password_reset_token(kwargs["raw_token"])


def test_forgot_password_unknown_email_no_token(client: TestClient, db: Session) -> None:
    with patch("app.routers.auth.send_password_reset_email") as send_mail:
        response = client.post(
            "/api/auth/forgot-password",
            json={"email": "ghost@example.com"},
        )
    assert response.status_code == 200
    send_mail.assert_not_called()
    assert db.query(PasswordResetToken).count() == 0


def test_forgot_password_pending_resends_verify(client: TestClient, db: Session) -> None:
    raw, token_hash = new_email_verify_token()
    db.add(
        PendingRegistration(
            email="pending@example.com",
            full_name="Pending",
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
    with (
        patch("app.routers.auth.send_password_reset_email") as reset_mail,
        patch("app.routers.auth.send_verification_email") as verify_mail,
    ):
        response = client.post(
            "/api/auth/forgot-password",
            json={"email": "pending@example.com"},
        )
    assert response.status_code == 200
    reset_mail.assert_not_called()
    verify_mail.assert_called_once()
    assert raw  # prior token existed


def test_reset_password_success_and_login(client: TestClient, db: Session) -> None:
    user = _make_user(db)
    raw, token_hash = new_password_reset_token()
    db.add(
        PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        )
    )
    db.commit()

    response = client.post(
        "/api/auth/reset-password",
        json={"token": raw, "new_password": NEW_PASSWORD},
    )
    assert response.status_code == 200
    assert "updated" in response.json()["message"].lower()

    db.refresh(user)
    assert verify_password(NEW_PASSWORD, user.hashed_password)
    assert db.query(PasswordResetToken).count() == 0

    old_login = client.post(
        "/api/auth/login",
        json={"email": "student@example.com", "password": STRONG_PASSWORD},
    )
    assert old_login.status_code == 401

    new_login = client.post(
        "/api/auth/login",
        json={"email": "student@example.com", "password": NEW_PASSWORD},
    )
    assert new_login.status_code == 200
    assert "access_token" in new_login.json()


def test_reset_password_rejects_expired_token(client: TestClient, db: Session) -> None:
    user = _make_user(db)
    raw, token_hash = new_password_reset_token()
    db.add(
        PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=datetime.now(timezone.utc) - timedelta(minutes=1),
        )
    )
    db.commit()

    response = client.post(
        "/api/auth/reset-password",
        json={"token": raw, "new_password": NEW_PASSWORD},
    )
    assert response.status_code == 400
    assert "invalid or has expired" in response.json()["detail"].lower()
    db.refresh(user)
    assert verify_password(STRONG_PASSWORD, user.hashed_password)


def test_reset_password_rejects_invalid_token(client: TestClient, db: Session) -> None:
    _make_user(db)
    response = client.post(
        "/api/auth/reset-password",
        json={"token": "this-token-is-not-valid-xxxxxx", "new_password": NEW_PASSWORD},
    )
    assert response.status_code == 400


def test_reset_password_rejects_weak_password(client: TestClient, db: Session) -> None:
    user = _make_user(db)
    raw, token_hash = new_password_reset_token()
    db.add(
        PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        )
    )
    db.commit()
    response = client.post(
        "/api/auth/reset-password",
        json={"token": raw, "new_password": "short"},
    )
    assert response.status_code == 422


def test_reset_password_clears_lockout(client: TestClient, db: Session) -> None:
    user = _make_user(db)
    user.failed_login_count = LOGIN_MAX_FAILURES
    user.login_locked_until = datetime.now(timezone.utc) + timedelta(minutes=15)
    raw, token_hash = new_password_reset_token()
    db.add(
        PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        )
    )
    db.commit()

    response = client.post(
        "/api/auth/reset-password",
        json={"token": raw, "new_password": NEW_PASSWORD},
    )
    assert response.status_code == 200
    db.refresh(user)
    assert user.failed_login_count == 0
    assert user.login_locked_until is None

    login = client.post(
        "/api/auth/login",
        json={"email": "student@example.com", "password": NEW_PASSWORD},
    )
    assert login.status_code == 200


def test_change_password_while_authenticated(client: TestClient, db: Session) -> None:
    _make_user(db)
    login = client.post(
        "/api/auth/login",
        json={"email": "student@example.com", "password": STRONG_PASSWORD},
    )
    assert login.status_code == 200
    token = login.json()["access_token"]

    change = client.post(
        "/api/auth/me/change-password",
        headers={"Authorization": f"Bearer {token}"},
        json={"current_password": STRONG_PASSWORD, "new_password": NEW_PASSWORD},
    )
    assert change.status_code == 204

    old = client.post(
        "/api/auth/login",
        json={"email": "student@example.com", "password": STRONG_PASSWORD},
    )
    assert old.status_code == 401

    new = client.post(
        "/api/auth/login",
        json={"email": "student@example.com", "password": NEW_PASSWORD},
    )
    assert new.status_code == 200

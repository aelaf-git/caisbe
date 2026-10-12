"""Per-student portal appearance must not leak across users or global settings."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import AppSetting, User
from app.security.auth import hash_password
from app.services.settings import get_setting, set_settings

STRONG_PASSWORD = "Str0ng-Password!99"


def _make_student(db: Session, *, email: str, name: str) -> User:
    user = User(
        full_name=name,
        email=email,
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
    assert response.status_code == 200
    return response.json()["access_token"]


def test_appearance_defaults_on_me(client: TestClient, db: Session) -> None:
    user = _make_student(db, email="a@example.com", name="Student A")
    token = _login(client, user.email)
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    body = me.json()
    assert body["ui_theme"] == "light"
    assert body["ui_font_size"] == "md"
    assert body["ui_font_body"] == "nunito"
    assert body["ui_font_display"] == "poppins"


def test_appearance_is_isolated_per_student(client: TestClient, db: Session) -> None:
    a = _make_student(db, email="a@example.com", name="Student A")
    b = _make_student(db, email="b@example.com", name="Student B")

    token_a = _login(client, a.email)
    patch_a = client.patch(
        "/api/auth/me/appearance",
        headers={"Authorization": f"Bearer {token_a}"},
        json={
            "ui_theme": "dark",
            "ui_font_size": "xl",
            "ui_font_body": "inter",
            "ui_font_display": "merriweather",
        },
    )
    assert patch_a.status_code == 200
    assert patch_a.json()["ui_theme"] == "dark"
    assert patch_a.json()["ui_font_size"] == "xl"

    token_b = _login(client, b.email)
    me_b = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token_b}"})
    assert me_b.status_code == 200
    assert me_b.json()["ui_theme"] == "light"
    assert me_b.json()["ui_font_size"] == "md"
    assert me_b.json()["ui_font_body"] == "nunito"

    db.refresh(a)
    db.refresh(b)
    assert a.ui_theme == "dark"
    assert a.ui_font_body == "inter"
    assert b.ui_theme == "light"
    assert b.ui_font_body == "nunito"


def test_student_appearance_does_not_change_global_app_settings(
    client: TestClient, db: Session
) -> None:
    set_settings(db, {"ui_theme": "light"})
    db.commit()
    user = _make_student(db, email="a@example.com", name="Student A")
    token = _login(client, user.email)

    response = client.patch(
        "/api/auth/me/appearance",
        headers={"Authorization": f"Bearer {token}"},
        json={"ui_theme": "dark"},
    )
    assert response.status_code == 200
    assert response.json()["ui_theme"] == "dark"

    assert get_setting(db, "ui_theme") == "light"
    global_row = db.query(AppSetting).filter(AppSetting.key == "ui_theme").first()
    assert global_row is not None
    assert global_row.value == "light"


def test_appearance_rejects_invalid_theme(client: TestClient, db: Session) -> None:
    user = _make_student(db, email="a@example.com", name="Student A")
    token = _login(client, user.email)
    response = client.patch(
        "/api/auth/me/appearance",
        headers={"Authorization": f"Bearer {token}"},
        json={"ui_theme": "neon"},
    )
    assert response.status_code == 422

"""Admin can add and remove seminars shown on the certificate programs page."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import User
from app.security.auth import hash_password

STRONG_PASSWORD = "Str0ng-Password!99"


def _admin(db: Session) -> User:
    user = User(
        full_name="Seminar Admin",
        email="seminar-admin@example.com",
        phone="+15555550111",
        country="Canada",
        city="Toronto",
        hashed_password=hash_password(STRONG_PASSWORD),
        role="admin",
        membership_type="student",
        membership_status="active",
        membership_date=datetime.now(timezone.utc),
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


def test_admin_can_add_hide_and_remove_a_seminar(client: TestClient, db: Session) -> None:
    admin = _admin(db)
    headers = _login(client, admin.email)

    created = client.post(
        "/api/admin/seminars",
        headers=headers,
        json={
            "title": "Energy Seminar",
            "description": "A short seminar on energy performance.",
            "published": True,
            "sort_order": 1,
        },
    )
    assert created.status_code == 201, created.text
    seminar_id = created.json()["id"]

    hidden = client.post(
        "/api/admin/seminars",
        headers=headers,
        json={
            "title": "Draft Seminar",
            "description": "Not ready for the public page.",
            "published": False,
        },
    )
    assert hidden.status_code == 201, hidden.text

    public = client.get("/api/seminars")
    assert public.status_code == 200, public.text
    titles = [item["title"] for item in public.json()]
    assert titles == ["Energy Seminar"]

    removed = client.delete(f"/api/admin/seminars/{seminar_id}", headers=headers)
    assert removed.status_code == 204, removed.text
    assert client.get("/api/seminars").json() == []

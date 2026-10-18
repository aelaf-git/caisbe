"""Admin and public leadership people endpoints."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import LeadershipPerson, User
from app.security.auth import hash_password

STRONG_PASSWORD = "Str0ng-Password!99"


def _admin(db: Session) -> User:
    admin = User(
        full_name="Leadership Admin",
        email="leadership-admin@example.com",
        phone="+15555550199",
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


def test_admin_leadership_crud_and_public_list(client: TestClient, db: Session) -> None:
    admin = _admin(db)
    token = _login(client, admin.email)
    headers = {"Authorization": f"Bearer {token}"}

    created = client.post(
        "/api/admin/leadership",
        headers=headers,
        json={
            "name": "Ms. Example Leader",
            "role": "Director of Programs",
            "credentials": "MBA, FMP",
            "bio": "Leads programs across Canada and Africa.",
            "email": "example.leader@caisbe.org",
            "published": True,
            "sort_order": 10,
        },
    )
    assert created.status_code == 201, created.text
    person_id = created.json()["id"]
    assert created.json()["name"] == "Ms. Example Leader"

    listed = client.get("/api/admin/leadership", headers=headers)
    assert listed.status_code == 200
    assert any(row["id"] == person_id for row in listed.json())

    public = client.get("/api/leadership")
    assert public.status_code == 200
    assert any(row["id"] == person_id for row in public.json())

    hidden = client.patch(
        f"/api/admin/leadership/{person_id}",
        headers=headers,
        json={"published": False},
    )
    assert hidden.status_code == 200
    public_hidden = client.get("/api/leadership")
    assert public_hidden.status_code == 200
    assert all(row["id"] != person_id for row in public_hidden.json())

    deleted = client.delete(f"/api/admin/leadership/{person_id}", headers=headers)
    assert deleted.status_code == 204
    assert db.query(LeadershipPerson).filter(LeadershipPerson.id == person_id).first() is None

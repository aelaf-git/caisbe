"""Profile PATCH clearing optional fields."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import User
from app.security.auth import hash_password

STRONG_PASSWORD = "Str0ng-Password!99"


def _make_user(db: Session) -> User:
    user = User(
        full_name="Ada Lovelace",
        email="ada@example.com",
        phone="+15555550100",
        country="Canada",
        city="Toronto",
        address="1 Babbage St",
        organization="Analytical Engines",
        job_title="Mathematician",
        given_name="Ada",
        family_name="Lovelace",
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


def test_profile_patch_clears_optional_fields(client: TestClient, db: Session) -> None:
    user = _make_user(db)
    login = client.post(
        "/api/auth/login",
        json={"email": "ada@example.com", "password": STRONG_PASSWORD},
    )
    assert login.status_code == 200
    token = login.json()["access_token"]

    response = client.patch(
        "/api/auth/me/profile",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "full_name": "Ada Lovelace",
            "given_name": "Ada",
            "family_name": "Lovelace",
            "phone": "+15555550100",
            "country": "Canada",
            "city": "Toronto",
            "address": None,
            "organization": None,
            "job_title": None,
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["address"] is None
    assert body["organization"] is None
    assert body["job_title"] is None

    db.refresh(user)
    assert user.address is None
    assert user.organization is None
    assert user.job_title is None

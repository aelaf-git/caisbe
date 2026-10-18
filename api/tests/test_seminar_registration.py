"""Seminar email-gate registration flow."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Seminar, SeminarAccessToken, User
from app.security.auth import hash_password, hash_secure_token, new_secure_token
from app.services.seminar_registration import ACCESS_HOURS
from datetime import timedelta

STRONG_PASSWORD = "Str0ng-Password!99"


def _admin(db: Session) -> User:
    admin = User(
        full_name="Seminar Admin",
        email="seminar-admin@example.com",
        phone="+15555550188",
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


def test_seminar_access_verify_and_register(client: TestClient, db: Session) -> None:
    seminar = Seminar(
        title="Test Seminar",
        description="A test seminar",
        event_date_label="Thursday, November 12, 2026",
        registration_enabled=True,
        member_price_cents=5000,
        non_member_price_cents=7500,
        student_price_cents=4000,
        published=True,
        sort_order=0,
    )
    db.add(seminar)
    db.commit()
    db.refresh(seminar)

    raw, token_hash = new_secure_token()
    access = SeminarAccessToken(
        seminar_id=seminar.id,
        email="attendee@example.com",
        token_hash=token_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=ACCESS_HOURS),
    )
    db.add(access)
    db.commit()

    verified = client.post(
        f"/api/seminars/{seminar.id}/access/verify",
        json={"token": raw},
    )
    assert verified.status_code == 200, verified.text
    assert verified.json()["email"] == "attendee@example.com"

    registered = client.post(
        f"/api/seminars/{seminar.id}/register",
        json={
            "access_token": raw,
            "first_name": "Ada",
            "last_name": "Lovelace",
            "email": "attendee@example.com",
            "phone": "+15555550100",
            "job_title": "Facility Manager",
            "company": "Acme FM",
            "city": "Chicago",
            "state_province": "IL",
            "country": "USA",
            "position": "Facility Manager",
            "membership_status": "association_member",
            "member_id": "MEM-123",
            "earning_ceu": False,
            "attendance": "virtual",
        },
    )
    assert registered.status_code == 201, registered.text
    body = registered.json()
    assert body["status"] in {"paid", "pending_payment"}
    assert body["amount_cents"] == 5000

    admin = _admin(db)
    token = _login(client, admin.email)
    regs = client.get(
        f"/api/admin/seminars/{seminar.id}/registrations",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert regs.status_code == 200
    assert len(regs.json()) >= 1
    assert regs.json()[0]["email"] == "attendee@example.com"


def test_hash_roundtrip() -> None:
    raw, token_hash = new_secure_token()
    assert hash_secure_token(raw) == token_hash

"""Seminar email-gate registration, confirmation, and manage portal."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from unittest.mock import patch
from urllib.parse import parse_qs, urlparse

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Seminar, SeminarAccessToken, SeminarRegistration, User
from app.security.auth import hash_password, hash_secure_token, new_secure_token
from app.services.seminar_registration import ACCESS_HOURS

STRONG_PASSWORD = "Str0ng-Password!99"


def _admin(db: Session, email: str = "seminar-admin@example.com") -> User:
    admin = User(
        full_name="Seminar Admin",
        email=email,
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


def _seminar(db: Session, **kwargs) -> Seminar:
    defaults = dict(
        title="Test Seminar",
        description="A test seminar",
        event_date_label="Thursday, November 12, 2026",
        event_time_label="9:00 AM ET",
        venue_address="815-4AVE SW, Calgary",
        online_join_url="https://meet.example.com/seminar",
        registration_enabled=True,
        member_price_cents=0,
        non_member_price_cents=0,
        student_price_cents=0,
        published=True,
        sort_order=0,
    )
    defaults.update(kwargs)
    seminar = Seminar(**defaults)
    db.add(seminar)
    db.commit()
    db.refresh(seminar)
    return seminar


def _access(
    db: Session,
    seminar: Seminar,
    email: str = "attendee@example.com",
    name: str = "Ada Lovelace",
) -> str:
    raw, token_hash = new_secure_token()
    access = SeminarAccessToken(
        seminar_id=seminar.id,
        email=email,
        requester_name=name,
        token_hash=token_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=ACCESS_HOURS),
    )
    db.add(access)
    db.commit()
    return raw


def _register_payload(access_token: str, email: str = "attendee@example.com", **overrides):
    payload = {
        "access_token": access_token,
        "first_name": "Ada",
        "last_name": "Lovelace",
        "email": email,
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
    }
    payload.update(overrides)
    return payload


def test_seminar_access_email_requires_name_and_sends_copy(
    client: TestClient, db: Session
) -> None:
    seminar = _seminar(db)

    missing = client.post(
        f"/api/seminars/{seminar.id}/access",
        json={"email": "attendee@example.com"},
    )
    assert missing.status_code == 422

    with patch("app.services.seminar_registration.send_email") as send:
        ok = client.post(
            f"/api/seminars/{seminar.id}/access",
            json={"name": "Ada Lovelace", "email": "attendee@example.com"},
        )
        assert ok.status_code == 200, ok.text
        assert send.call_count == 1
        kwargs = send.call_args.kwargs
        assert kwargs["template_key"] == "seminar_access"
        assert "Complete your registration" in kwargs["subject"]
        body = kwargs["html_body"]
        assert "Dear Ada Lovelace," in body
        assert "Test Seminar" in body
        assert "Click Here to Complete Your Registration" in body
        assert "Event Details at a Glance" in body
        assert "Thursday, November 12, 2026" in body
        assert "9:00 AM ET" in body
        assert "The CAISBE Registration Team" in body
        assert f"/professional-development/seminars/{seminar.id}/register?token=" in body

    row = (
        db.query(SeminarAccessToken)
        .filter(SeminarAccessToken.seminar_id == seminar.id)
        .order_by(SeminarAccessToken.id.desc())
        .first()
    )
    assert row is not None
    assert row.requester_name == "Ada Lovelace"
    assert row.email == "attendee@example.com"


def test_seminar_access_verify_and_register(client: TestClient, db: Session) -> None:
    seminar = _seminar(db, member_price_cents=5000, non_member_price_cents=7500, student_price_cents=4000)
    raw = _access(db, seminar)

    verified = client.post(f"/api/seminars/{seminar.id}/access/verify", json={"token": raw})
    assert verified.status_code == 200, verified.text
    assert verified.json()["email"] == "attendee@example.com"
    assert verified.json()["requester_name"] == "Ada Lovelace"

    registered = client.post(
        f"/api/seminars/{seminar.id}/register",
        json=_register_payload(raw),
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


def test_paid_registration_sends_confirmation_once(client: TestClient, db: Session) -> None:
    seminar = _seminar(db)
    raw = _access(db, seminar)

    with patch("app.services.seminar_confirmation_email.send_email") as send:
        registered = client.post(
            f"/api/seminars/{seminar.id}/register",
            json=_register_payload(raw),
        )
        assert registered.status_code == 201, registered.text
        body = registered.json()
        assert body["status"] == "paid"
        assert body["manage_url"]
        assert send.call_count == 1
        assert "Registration confirmed" in send.call_args.kwargs["subject"]

    row = db.query(SeminarRegistration).filter(SeminarRegistration.id == body["id"]).one()
    assert row.manage_token_hash
    assert row.confirmation_email_sent_at is not None

    with patch("app.services.seminar_confirmation_email.send_email") as send_again:
        # Confirm path for already-paid should not double-email
        confirm = client.post(
            f"/api/seminars/registrations/confirm?registration_id={row.id}",
            json={"session_id": "dev-session"},
        )
        assert confirm.status_code == 200
        assert send_again.call_count == 0
        assert confirm.json()["manage_url"] is None


def test_manage_get_patch_cancel(client: TestClient, db: Session) -> None:
    seminar = _seminar(db, capacity_in_person=1, capacity_virtual=10)
    raw = _access(db, seminar, email="manage@example.com")

    with patch("app.services.seminar_confirmation_email.send_email"):
        registered = client.post(
            f"/api/seminars/{seminar.id}/register",
            json=_register_payload(raw, email="manage@example.com", attendance="in_person"),
        )
    assert registered.status_code == 201, registered.text
    manage_url = registered.json()["manage_url"]
    assert manage_url
    token = parse_qs(urlparse(manage_url).query)["token"][0]

    detail = client.get(
        f"/api/seminars/registrations/manage?token={token}&seminar_id={seminar.id}",
    )
    assert detail.status_code == 200, detail.text
    payload = detail.json()
    assert payload["ticket_reference"] == f"#{registered.json()['id']}"
    assert payload["can_edit"] is True
    assert payload["attendance"] == "in_person"

    updated = client.patch(
        "/api/seminars/registrations/manage",
        json={
            "token": token,
            "first_name": "Ada",
            "last_name": "Lovelace",
            "phone": "+15555550999",
            "job_title": "Facility Manager",
            "company": "Acme FM",
            "city": "Chicago",
            "state_province": "IL",
            "country": "USA",
            "position": "Facility Manager",
            "earning_ceu": False,
            "attendance": "virtual",
            "accommodations": None,
        },
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["attendance"] == "virtual"
    assert updated.json()["online_join_url"] == "https://meet.example.com/seminar"

    bad = client.get("/api/seminars/registrations/manage?token=not-a-real-token")
    assert bad.status_code == 400

    cancelled = client.post(
        "/api/seminars/registrations/manage/cancel",
        json={"token": token},
    )
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "cancelled"
    assert cancelled.json()["can_edit"] is False

    blocked = client.patch(
        "/api/seminars/registrations/manage",
        json={
            "token": token,
            "first_name": "Ada",
            "last_name": "Lovelace",
            "phone": "+15555550999",
            "job_title": "Facility Manager",
            "company": "Acme FM",
            "city": "Chicago",
            "state_province": "IL",
            "country": "USA",
            "position": "Facility Manager",
            "earning_ceu": False,
            "attendance": "virtual",
        },
    )
    assert blocked.status_code == 400


def test_hash_roundtrip() -> None:
    raw, token_hash = new_secure_token()
    assert hash_secure_token(raw) == token_hash

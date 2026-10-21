"""Outbound email archive, contact reply history, and ticket-linked emails."""

from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import (
    ContactMessage,
    ContactMessageReply,
    NewsletterSubscriber,
    OutboundEmail,
    SupportMessage,
    SupportThread,
    User,
)
from app.security.auth import hash_password
from app.services.email import EmailDeliveryError, send_email

STRONG_PASSWORD = "Str0ng-Password!99"


def _user(db: Session, *, email: str, role: str = "student", name: str = "Test User") -> User:
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


def test_send_email_archives_skipped_dev(db: Session) -> None:
    row_id = send_email(
        to="archive@example.com",
        subject="Hello archive",
        html_body="<p>Body</p>",
        purpose="system",
        template_key="verify_email",
        related_type="pending_registration",
        related_id=42,
        db=db,
    )
    db.commit()
    assert row_id is not None
    row = db.query(OutboundEmail).filter(OutboundEmail.id == row_id).one()
    assert row.status == "skipped_dev"
    assert row.to_address == "archive@example.com"
    assert row.subject == "Hello archive"
    assert row.html_body == "<p>Body</p>"
    assert row.template_key == "verify_email"
    assert row.related_type == "pending_registration"
    assert row.related_id == 42
    assert row.provider == "resend"


def test_send_email_archives_sent_and_failed(db: Session, monkeypatch) -> None:
    monkeypatch.setattr("app.config.settings.resend_api_key", "re_test_key")

    mock_resend = MagicMock()
    mock_resend.Emails.send.return_value = {"id": "msg_123"}
    with patch.dict("sys.modules", {"resend": mock_resend}):
        sent_id = send_email(
            to="sent@example.com",
            subject="Sent mail",
            html_body="<p>ok</p>",
            template_key="receipt",
            db=db,
        )
        db.commit()
    sent = db.query(OutboundEmail).filter(OutboundEmail.id == sent_id).one()
    assert sent.status == "sent"
    assert sent.provider_message_id == "msg_123"

    mock_resend.Emails.send.side_effect = RuntimeError("provider down")
    with patch.dict("sys.modules", {"resend": mock_resend}):
        try:
            send_email(
                to="fail@example.com",
                subject="Fail mail",
                html_body="<p>no</p>",
                template_key="receipt",
                db=db,
            )
            raise AssertionError("expected EmailDeliveryError")
        except EmailDeliveryError:
            db.commit()
    failed = (
        db.query(OutboundEmail)
        .filter(OutboundEmail.to_address == "fail@example.com")
        .one()
    )
    assert failed.status == "failed"
    assert "provider down" in (failed.error_message or "")


def test_contact_inbound_and_admin_reply_history(client: TestClient, db: Session) -> None:
    admin = _user(db, email="contact-admin@example.com", role="admin", name="Contact Admin")
    admin_token = _login(client, admin.email)

    created = client.post(
        "/api/contact",
        json={
            "first_name": "Ada",
            "last_name": "Lovelace",
            "email": "ada@example.com",
            "comments": "Please help with membership.",
        },
    )
    assert created.status_code == 201, created.text
    message_id = created.json()["id"]

    msg = (
        db.query(ContactMessage)
        .filter(ContactMessage.id == message_id)
        .one()
    )
    inbound = (
        db.query(ContactMessageReply)
        .filter(
            ContactMessageReply.contact_message_id == message_id,
            ContactMessageReply.direction == "inbound",
        )
        .all()
    )
    assert len(inbound) == 1
    assert inbound[0].body == "Please help with membership."

    ack = (
        db.query(OutboundEmail)
        .filter(
            OutboundEmail.template_key == "request_received",
            OutboundEmail.related_type == "contact_message",
            OutboundEmail.related_id == message_id,
        )
        .one()
    )
    assert ack.to_address == "ada@example.com"
    assert ack.status == "skipped_dev"

    reply = client.post(
        f"/api/admin/contact-messages/{message_id}/reply",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"subject": "Re: Membership", "body": "We can help — please reply with details."},
    )
    assert reply.status_code == 200, reply.text
    payload = reply.json()
    assert payload["status"] == "replied"
    assert payload["admin_reply"].startswith("We can help")
    assert len(payload["replies"]) == 2
    assert payload["replies"][0]["direction"] == "inbound"
    assert payload["replies"][1]["direction"] == "outbound"
    assert payload["replies"][1]["outbound_email_id"] is not None

    outbound_reply = (
        db.query(OutboundEmail)
        .filter(
            OutboundEmail.template_key == "contact_admin_reply",
            OutboundEmail.related_id == message_id,
        )
        .one()
    )
    assert outbound_reply.status == "skipped_dev"
    assert msg.id == message_id


def test_support_ticket_request_received_linked(client: TestClient, db: Session) -> None:
    student = _user(db, email="ticket-student@example.com", name="Ticket Student")
    token = _login(client, student.email)

    created = client.post(
        "/api/me/support/threads",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "subject": "Need help with exam",
            "kind": "question",
            "body": "How do I request exam access?",
        },
    )
    assert created.status_code == 201, created.text
    thread_id = created.json()["id"]

    messages = db.query(SupportMessage).filter(SupportMessage.thread_id == thread_id).all()
    assert len(messages) == 1
    assert messages[0].body.startswith("How do I request")

    thread = db.query(SupportThread).filter(SupportThread.id == thread_id).one()
    assert thread.status == "waiting_admin"

    outbound = (
        db.query(OutboundEmail)
        .filter(
            OutboundEmail.template_key == "request_received",
            OutboundEmail.related_type == "support_thread",
            OutboundEmail.related_id == thread_id,
        )
        .one()
    )
    assert outbound.to_address == student.email
    assert outbound.status == "skipped_dev"


def test_newsletter_campaign_creates_one_outbound_per_recipient(
    client: TestClient, db: Session
) -> None:
    admin = _user(db, email="nl-admin@example.com", role="admin", name="NL Admin")
    token = _login(client, admin.email)
    for email in ("one@example.com", "two@example.com"):
        db.add(NewsletterSubscriber(email=email, source="test"))
    db.commit()
    subs = db.query(NewsletterSubscriber).order_by(NewsletterSubscriber.id).all()

    response = client.post(
        "/api/admin/newsletter/send",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "subject": "October Update",
            "body_html": "<p>Hello subscribers</p>",
            "subscriber_ids": [subs[0].id, subs[1].id],
            "attachments": [],
        },
    )
    assert response.status_code == 200, response.text
    campaign_id = response.json()["campaign_id"]
    assert response.json()["recipient_count"] == 2

    rows = (
        db.query(OutboundEmail)
        .filter(
            OutboundEmail.template_key == "newsletter_campaign",
            OutboundEmail.related_type == "newsletter_campaign",
            OutboundEmail.related_id == campaign_id,
        )
        .order_by(OutboundEmail.to_address)
        .all()
    )
    assert len(rows) == 2
    assert {row.to_address for row in rows} == {"one@example.com", "two@example.com"}
    assert all(row.status == "skipped_dev" for row in rows)

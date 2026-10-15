"""Newsletter subscribe uniqueness, unsubscribe tokens, and admin delete."""

from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import NewsletterSubscriber, User
from app.security.auth import hash_password
from app.services.newsletter_unsubscribe import make_unsubscribe_token

STRONG_PASSWORD = "Str0ng-Password!99"


def _make_admin(db: Session) -> User:
    admin = User(
        full_name="Newsletter Admin",
        email="newsletter-admin@example.com",
        phone="+15555550998",
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


def test_subscribe_twice_keeps_one_row_and_sends_already_subscribed_email(
    client: TestClient, db: Session
) -> None:
    with patch("app.services.newsletter_subscribed_email.send_email") as send:
        first = client.post("/api/newsletter/subscribe", json={"email": "Unique@Example.com"})
        assert first.status_code == 201
        assert send.call_args.kwargs["subject"] == "You're Successfully Subscribed"

        second = client.post("/api/newsletter/subscribe", json={"email": "unique@example.com"})
        assert second.status_code == 201
        assert second.json()["message"] == "You are already subscribed."
        assert send.call_count == 2
        assert (
            send.call_args.kwargs["subject"]
            == "You're Already Subscribed to the CAISBE Newsletter"
        )
        assert "already subscribed" in send.call_args.kwargs["html_body"].lower()
        assert "/newsletter/unsubscribe?token=" in send.call_args.kwargs["html_body"]

    rows = db.query(NewsletterSubscriber).filter(NewsletterSubscriber.email == "unique@example.com").all()
    assert len(rows) == 1
    assert rows[0].unsubscribed_at is None
    token = make_unsubscribe_token(subscriber_id=rows[0].id, email=rows[0].email)
    client.post("/api/newsletter/unsubscribe", json={"token": token})

    with patch("app.services.newsletter_subscribed_email.send_email") as send_resub:
        resub = client.post("/api/newsletter/subscribe", json={"email": "unique@example.com"})
        assert resub.status_code == 201
        assert send_resub.call_count == 1
        assert send_resub.call_args.kwargs["subject"] == "You're Successfully Subscribed"


def test_unsubscribe_with_valid_token_sets_unsubscribed_at(
    client: TestClient, db: Session
) -> None:
    with patch("app.services.newsletter_subscribed_email.send_email"):
        client.post("/api/newsletter/subscribe", json={"email": "leave@example.com"})
    row = db.query(NewsletterSubscriber).filter(NewsletterSubscriber.email == "leave@example.com").one()
    token = make_unsubscribe_token(subscriber_id=row.id, email=row.email)

    response = client.post("/api/newsletter/unsubscribe", json={"token": token})
    assert response.status_code == 200
    assert "unsubscribed" in response.json()["message"].lower()

    db.refresh(row)
    assert row.unsubscribed_at is not None

    # Idempotent
    again = client.post("/api/newsletter/unsubscribe", json={"token": token})
    assert again.status_code == 200

    admin = _make_admin(db)
    admin_token = _login(client, admin.email)
    active = client.get(
        "/api/admin/newsletter/subscribers?active_only=true",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert active.status_code == 200
    assert all(item["email"] != "leave@example.com" for item in active.json())


def test_unsubscribe_invalid_token_returns_400(client: TestClient, db: Session) -> None:
    with patch("app.services.newsletter_subscribed_email.send_email"):
        client.post("/api/newsletter/subscribe", json={"email": "keep@example.com"})
    row = db.query(NewsletterSubscriber).filter(NewsletterSubscriber.email == "keep@example.com").one()

    bad = client.post("/api/newsletter/unsubscribe", json={"token": f"{row.id}.{'0' * 64}"})
    assert bad.status_code == 400

    malformed = client.post("/api/newsletter/unsubscribe", json={"token": "not-a-token"})
    assert malformed.status_code == 400

    db.refresh(row)
    assert row.unsubscribed_at is None


def test_admin_delete_removes_subscriber_row(client: TestClient, db: Session) -> None:
    with patch("app.services.newsletter_subscribed_email.send_email"):
        client.post("/api/newsletter/subscribe", json={"email": "gone@example.com"})
    row = db.query(NewsletterSubscriber).filter(NewsletterSubscriber.email == "gone@example.com").one()
    subscriber_id = row.id

    admin = _make_admin(db)
    admin_token = _login(client, admin.email)
    deleted = client.delete(
        f"/api/admin/newsletter/subscribers/{subscriber_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert deleted.status_code == 200, deleted.text
    assert "gone@example.com" in deleted.json()["message"]
    assert db.query(NewsletterSubscriber).filter(NewsletterSubscriber.id == subscriber_id).first() is None

    missing = client.delete(
        f"/api/admin/newsletter/subscribers/{subscriber_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert missing.status_code == 404


def test_campaign_send_skips_unsubscribed_and_includes_footer(
    client: TestClient, db: Session
) -> None:
    with patch("app.services.newsletter_subscribed_email.send_email"):
        client.post("/api/newsletter/subscribe", json={"email": "active@example.com"})
        client.post("/api/newsletter/subscribe", json={"email": "soft@example.com"})

    soft = db.query(NewsletterSubscriber).filter(NewsletterSubscriber.email == "soft@example.com").one()
    soft.unsubscribed_at = datetime.now(timezone.utc)
    db.commit()

    active = db.query(NewsletterSubscriber).filter(NewsletterSubscriber.email == "active@example.com").one()
    soft_id = soft.id

    admin = _make_admin(db)
    admin_token = _login(client, admin.email)

    with patch("app.routers.admin.publishing.send_email") as send:
        response = client.post(
            "/api/admin/newsletter/send",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "subject": "Hello",
                "body_html": "<p>News</p>",
                "subscriber_ids": [active.id, soft_id],
            },
        )
        assert response.status_code == 200, response.text
        assert response.json()["recipient_count"] == 1
        assert send.call_count == 1
        assert send.call_args.kwargs["to"] == "active@example.com"
        html = send.call_args.kwargs["html_body"]
        assert "<p>News</p>" in html
        assert "/newsletter/unsubscribe?token=" in html
        assert "Unsubscribe" in html

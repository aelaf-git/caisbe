"""A course can be listed before its lessons are ready."""

from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Enrollment, Payment, User
from app.security.auth import hash_password

STRONG_PASSWORD = "Str0ng-Password!99"
NOT_READY = "This course is not ready yet."


def _user(db: Session, email: str, role: str) -> User:
    user = User(
        full_name="CAISBE User",
        email=email,
        phone="+15555550111",
        country="Canada",
        city="Toronto",
        hashed_password=hash_password(STRONG_PASSWORD),
        role=role,
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
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def test_listing_is_public_before_lessons_open(client: TestClient, db: Session, monkeypatch) -> None:
    monkeypatch.setattr(settings, "stripe_secret_key", "sk_test_listing")
    monkeypatch.setattr(settings, "stripe_publishable_key", "pk_test_listing")
    monkeypatch.setattr(
        "app.services.commerce.create_stripe_session",
        lambda order, cancel_url: ("cs_test_listing", "https://checkout.stripe.test/cs_test_listing"),
    )
    admin = _user(db, "listing-admin@example.com", "admin")
    student = _user(db, "listing-student@example.com", "student")
    admin_token = _login(client, admin.email)
    student_token = _login(client, student.email)
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    student_headers = {"Authorization": f"Bearer {student_token}"}

    created = client.post(
        "/api/admin/courses",
        headers=admin_headers,
        json={
            "code": "LIST-1",
            "title": "Listed early",
            "description": "A short public description for the catalog card.",
            "slug": "listed-early",
            "cover_url": "/api/uploads/heroes/listed-early.png",
            "price_cents": 2500,
        },
    )
    assert created.status_code == 201, created.text
    course_id = created.json()["id"]

    listed = client.patch(
        f"/api/admin/courses/{course_id}",
        headers=admin_headers,
        json={"status": "published"},
    )
    assert listed.status_code == 200, listed.text
    assert listed.json()["status"] == "published"
    assert listed.json()["content_published"] is False

    catalog = client.get("/api/courses")
    assert catalog.status_code == 200, catalog.text
    card = next(item for item in catalog.json() if item["id"] == course_id)
    assert card["cover_url"] == "/api/uploads/heroes/listed-early.png"
    assert "short public description" in card["description"]
    assert card["content_published"] is False

    bought = client.post(
        "/api/me/checkout",
        headers=student_headers,
        json={"course_id": course_id},
    )
    assert bought.status_code == 200, bought.text
    assert bought.json()["status"] == "pending"
    assert bought.json()["checkout_url"] is None
    assert bought.json()["client_secret"] == "https://checkout.stripe.test/cs_test_listing"
    enrollment = db.query(Enrollment).filter(Enrollment.user_id == student.id).one()
    assert enrollment.status == "pending_payment"
    payment = db.query(Payment).filter(Payment.user_id == student.id).one()
    assert payment.status == "pending"

    closed = client.get(f"/api/courses/{course_id}", headers=student_headers)
    assert closed.status_code == 403, closed.text
    assert closed.json()["detail"] == NOT_READY
    lesson = client.get(f"/api/courses/{course_id}/lessons/1", headers=student_headers)
    assert lesson.status_code == 403, lesson.text
    assert lesson.json()["detail"] == NOT_READY

    too_soon = client.patch(
        f"/api/admin/courses/{course_id}",
        headers=admin_headers,
        json={"content_published": True},
    )
    assert too_soon.status_code == 400, too_soon.text
    assert "chapter" in too_soon.json()["detail"].lower()

    chapter = client.post(
        f"/api/admin/courses/{course_id}/chapters",
        headers=admin_headers,
        json={"title": "Chapter 1", "sort_order": 0},
    )
    assert chapter.status_code == 201, chapter.text
    topic = client.post(
        f"/api/admin/chapters/{chapter.json()['id']}/lessons",
        headers=admin_headers,
        json={"title": "Topic 1", "body": "The lesson is ready.", "sort_order": 0},
    )
    assert topic.status_code == 201, topic.text

    opened = client.patch(
        f"/api/admin/courses/{course_id}",
        headers=admin_headers,
        json={"content_published": True},
    )
    assert opened.status_code == 200, opened.text
    assert opened.json()["content_published"] is True

    enrollment.status = "enrolled"
    db.commit()
    player = client.get(f"/api/courses/{course_id}", headers=student_headers)
    assert player.status_code == 200, player.text
    assert player.json()["chapters"][0]["lessons"][0]["title"] == "Topic 1"

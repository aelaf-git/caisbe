"""Checkout uses Stripe when it is configured, and private files require a session."""

from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Course, Enrollment, Payment, User
from app.security.auth import hash_password

STRONG_PASSWORD = "Str0ng-Password!99"


def _user(db: Session, email: str) -> User:
    user = User(
        full_name="Learner",
        email=email,
        phone="+15555550111",
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


def test_checkout_stays_pending_until_stripe_confirms(client: TestClient, db: Session, monkeypatch) -> None:
    monkeypatch.setattr(settings, "stripe_secret_key", "sk_test_architecture")
    monkeypatch.setattr(
        "app.services.commerce.create_stripe_session",
        lambda order, cancel_url: ("cs_test_architecture", "https://checkout.stripe.test/cs_test_architecture"),
    )
    student = _user(db, "stripe-buyer@example.com")
    course = Course(
        code="ARCH-STRIPE",
        title="Stripe Course",
        description="Paid program.",
        slug="arch-stripe",
        status="published",
        price_cents=2500,
        currency="usd",
    )
    db.add(course)
    db.commit()
    login = client.post(
        "/api/auth/login",
        json={"email": student.email, "password": STRONG_PASSWORD},
    )
    assert login.status_code == 200, login.text
    bought = client.post(
        "/api/me/checkout",
        headers={"Authorization": f"Bearer {login.json()['access_token']}"},
        json={"course_id": course.id},
    )
    assert bought.status_code == 200, bought.text
    body = bought.json()
    assert body["checkout_url"] == "https://checkout.stripe.test/cs_test_architecture"
    assert body["status"] == "pending"
    enrollment = db.query(Enrollment).filter(Enrollment.user_id == student.id).one()
    assert enrollment.status == "pending_payment"
    payment = db.query(Payment).filter(Payment.user_id == student.id).one()
    assert payment.provider == "stripe"
    assert payment.stripe_session_id == "cs_test_architecture"
    assert payment.status == "pending"


def test_session_cookie_is_accepted(client: TestClient, db: Session) -> None:
    student = _user(db, "cookie-student@example.com")
    login = client.post(
        "/api/auth/login",
        json={"email": student.email, "password": STRONG_PASSWORD},
    )
    token = login.json()["access_token"]
    me = client.get("/api/auth/me", cookies={"caisbe_portal_session": token})
    assert me.status_code == 200, me.text
    assert me.json()["email"] == student.email


def test_private_uploads_require_a_session(client: TestClient) -> None:
    private = client.get("/api/uploads/assignments/not-a-real-file.pdf")
    assert private.status_code == 401
    public = client.get("/api/uploads/heroes/not-a-real-file.png")
    assert public.status_code == 404

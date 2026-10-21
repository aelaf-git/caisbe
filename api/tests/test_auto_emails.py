"""Standardized transactional auto-response emails and their live triggers."""

from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Course, Enrollment, Order, OrderItem, Payment, User
from app.routers.courses.support import _finalize_course_completion
from app.security.auth import hash_password
from app.services.commerce import fulfill_order, refund_payment
from app.services.course_cancellation_email import send_course_cancellation_email
from app.services.course_completion_email import send_course_completion_email
from app.services.course_payment_email import send_course_payment_email
from app.services.course_registration_email import send_course_registration_email
from app.services.newsletter_subscribed_email import (
    send_newsletter_already_subscribed_email,
    send_newsletter_subscribed_email,
)
from app.services.request_received_email import send_request_received_email

STRONG_PASSWORD = "Str0ng-Password!99"


def _student(db: Session, email: str = "learner@example.com") -> User:
    user = User(
        full_name="Learner One",
        email=email,
        phone="+15555550111",
        country="Canada",
        city="Calgary",
        hashed_password=hash_password(STRONG_PASSWORD),
        role="student",
        membership_status="active",
        email_verified_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _admin(db: Session) -> User:
    admin = User(
        full_name="Admin One",
        email="admin-auto@example.com",
        phone="+15555550998",
        country="Canada",
        city="Calgary",
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
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def _course(db: Session) -> Course:
    course = Course(
        code="AUTO101",
        slug="auto-101",
        title="Auto Email Course",
        description="Test course",
        status="published",
        price_cents=12500,
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


def test_sender_bodies_use_standard_copy_and_logo() -> None:
    with patch("app.services.newsletter_subscribed_email.send_email") as send:
        send_newsletter_subscribed_email(to="a@example.com", subscriber_id=1)
        body = send.call_args.kwargs["html_body"]
        assert send.call_args.kwargs["subject"] == "You're Successfully Subscribed"
        assert "subscription has been confirmed" in body
        assert body.count("/images/logo.png") == 1
        assert "Canada Africa Institute for the Sustainable Built Environment" in body
        assert "/newsletter/unsubscribe?token=" in body
        assert send.call_args.kwargs["purpose"] == "newsletter"

    with patch("app.services.newsletter_subscribed_email.send_email") as send:
        send_newsletter_already_subscribed_email(to="a@example.com", subscriber_id=1)
        body = send.call_args.kwargs["html_body"]
        assert (
            send.call_args.kwargs["subject"]
            == "You're Already Subscribed to the CAISBE Newsletter"
        )
        assert "already subscribed" in body.lower()
        assert body.count("/images/logo.png") == 1
        assert "/newsletter/unsubscribe?token=" in body
        assert send.call_args.kwargs["purpose"] == "newsletter"

    with patch("app.services.course_registration_email.send_email") as send:
        send_course_registration_email(
            to="a@example.com",
            full_name="Ada",
            course_title="FM Basics",
            start_date=datetime(2026, 3, 1, tzinfo=timezone.utc),
        )
        assert "Course Registration Confirmed – FM Basics" == send.call_args.kwargs["subject"]
        assert "Self-paced" in send.call_args.kwargs["html_body"]
        assert "2026-03-01" in send.call_args.kwargs["html_body"]

    with patch("app.services.course_payment_email.send_email") as send:
        send_course_payment_email(
            to="a@example.com",
            full_name="Ada",
            course_title="FM Basics",
            amount_cents=9900,
            currency="usd",
            transaction_id="pi_123",
            paid_at=datetime(2026, 3, 2, tzinfo=timezone.utc),
        )
        assert send.call_args.kwargs["subject"] == "Payment Received – FM Basics"
        assert "$99.00" in send.call_args.kwargs["html_body"]
        assert "pi_123" in send.call_args.kwargs["html_body"]

    with patch("app.services.course_cancellation_email.send_email") as send:
        send_course_cancellation_email(
            to="a@example.com",
            full_name="Ada",
            course_title="FM Basics",
            cancelled_at=datetime(2026, 3, 3, tzinfo=timezone.utc),
        )
        assert "Course Cancellation Confirmed – FM Basics" == send.call_args.kwargs["subject"]
        assert "5–10 business days" in send.call_args.kwargs["html_body"]

    with patch("app.services.course_completion_email.send_email") as send:
        send_course_completion_email(
            to="a@example.com",
            full_name="Ada",
            course_title="FM Basics",
            certificate_code="CAISBE-TEST",
        )
        body = send.call_args.kwargs["html_body"]
        assert "You've Completed FM Basics" in send.call_args.kwargs["subject"]
        assert "View Certificate" in body
        assert "/certificates/CAISBE-TEST" in body

    with patch("app.services.request_received_email.send_email") as send:
        send_request_received_email(to="a@example.com", full_name="Ada")
        assert send.call_args.kwargs["subject"] == "We've Received Your Request"
        assert "24–48 hours" in send.call_args.kwargs["html_body"]
        assert send.call_args.kwargs["purpose"] == "contact"

    with patch("app.services.exam_access_request_admin_email.send_email") as send:
        from app.services.exam_access_request_admin_email import send_exam_access_request_admin_emails

        send_exam_access_request_admin_emails(
            admin_emails=["admin@example.com", "admin@example.com", "ops@example.com"],
            trainee_name="Ada Lovelace",
            trainee_email="ada@example.com",
            course_title="FM Basics",
            completed_at=datetime(2026, 4, 1, tzinfo=timezone.utc),
        )
        assert send.call_count == 2
        assert send.call_args.kwargs["subject"] == "Exam access requested — Ada Lovelace · FM Basics"
        body = send.call_args.kwargs["html_body"]
        assert "Hello Admin" in body
        assert "Ada Lovelace" in body
        assert "FM Basics" in body
        assert "Grant Exam Access" in body
        assert "/access-control" in body
        assert send.call_args.kwargs["purpose"] == "system"


def test_newsletter_subscribe_sends_success_email(client: TestClient, db: Session) -> None:
    with patch("app.services.newsletter_subscribed_email.send_email") as send:
        first = client.post("/api/newsletter/subscribe", json={"email": "news@example.com"})
        assert first.status_code == 201
        assert send.call_count == 1
        assert send.call_args.kwargs["to"] == "news@example.com"
        assert send.call_args.kwargs["subject"] == "You're Successfully Subscribed"

        again = client.post("/api/newsletter/subscribe", json={"email": "news@example.com"})
        assert again.status_code == 201
        assert again.json()["message"] == "You are already subscribed."
        assert send.call_count == 2
        assert send.call_args.kwargs["to"] == "news@example.com"
        assert (
            send.call_args.kwargs["subject"]
            == "You're Already Subscribed to the CAISBE Newsletter"
        )
        assert "already subscribed" in send.call_args.kwargs["html_body"].lower()


def test_contact_form_sends_request_received_email(client: TestClient, db: Session) -> None:
    with patch("app.services.request_received_email.send_email") as send:
        response = client.post(
            "/api/contact",
            json={
                "first_name": "Pat",
                "last_name": "Lee",
                "email": "pat@example.com",
                "comments": "Please call me about membership.",
            },
        )
        assert response.status_code == 201, response.text
        assert send.call_count == 1
        assert send.call_args.kwargs["to"] == "pat@example.com"
        assert "Pat Lee" in send.call_args.kwargs["html_body"]


def test_support_thread_sends_request_received_email(client: TestClient, db: Session) -> None:
    student = _student(db)
    token = _login(client, student.email)
    with patch("app.services.request_received_email.send_email") as send:
        response = client.post(
            "/api/me/support/threads",
            headers={"Authorization": f"Bearer {token}"},
            json={"subject": "Exam access", "kind": "question", "body": "I cannot open the exam."},
        )
        assert response.status_code == 201, response.text
        assert send.call_count == 1
        assert send.call_args.kwargs["to"] == student.email


def test_fulfill_order_sends_registration_payment_and_receipt(db: Session) -> None:
    user = _student(db)
    course = _course(db)
    order = Order(
        user_id=user.id,
        number="ORD-AUTO-1",
        status="pending",
        currency="usd",
        subtotal_cents=12500,
        discount_cents=0,
        total_cents=12500,
        amount_paid_cents=0,
    )
    db.add(order)
    db.flush()
    db.add(
        OrderItem(
            order_id=order.id,
            course_id=course.id,
            title=course.title,
            item_kind="course",
            unit_price_cents=12500,
            quantity=1,
        )
    )
    db.add(
        Payment(
            order_id=order.id,
            user_id=user.id,
            provider="stripe",
            amount_cents=12500,
            status="pending",
            stripe_payment_intent_id="pi_auto_test",
        )
    )
    db.commit()
    db.refresh(order)

    with (
        patch("app.services.course_registration_email.send_email") as reg,
        patch("app.services.course_payment_email.send_email") as pay,
        patch("app.services.receipt_email.send_email") as receipt,
    ):
        fulfill_order(db, order)
        db.commit()
        fulfill_order(db, order)

    assert reg.call_count == 1
    assert "Course Registration Confirmed" in reg.call_args.kwargs["subject"]
    assert pay.call_count == 1
    assert "Payment Received" in pay.call_args.kwargs["subject"]
    assert "pi_auto_test" in pay.call_args.kwargs["html_body"]
    assert receipt.call_count == 1
    assert "Your CAISBE receipt ORD-AUTO-1" == receipt.call_args.kwargs["subject"]


def test_refund_sends_cancellation_email(db: Session) -> None:
    user = _student(db)
    admin = _admin(db)
    course = _course(db)
    order = Order(
        user_id=user.id,
        number="ORD-AUTO-2",
        status="paid",
        currency="usd",
        subtotal_cents=12500,
        discount_cents=0,
        total_cents=12500,
        amount_paid_cents=12500,
        paid_at=datetime.now(timezone.utc),
    )
    db.add(order)
    db.flush()
    db.add(
        OrderItem(
            order_id=order.id,
            course_id=course.id,
            title=course.title,
            item_kind="course",
            unit_price_cents=12500,
            quantity=1,
        )
    )
    payment = Payment(
        order_id=order.id,
        user_id=user.id,
        provider="stripe",
        amount_cents=12500,
        status="succeeded",
    )
    db.add(payment)
    db.add(Enrollment(user_id=user.id, course_id=course.id, status="enrolled", progress=0))
    db.commit()
    db.refresh(payment)

    with patch("app.services.course_cancellation_email.send_email") as send:
        refund_payment(db, payment, admin)
        db.commit()

    assert send.call_count == 1
    assert "Course Cancellation Confirmed" in send.call_args.kwargs["subject"]
    assert course.title in send.call_args.kwargs["subject"]


def test_course_completion_sends_certificate_email(db: Session) -> None:
    user = _student(db)
    course = _course(db)
    enrollment = Enrollment(user_id=user.id, course_id=course.id, status="enrolled", progress=100)
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)

    with (
        patch(
            "app.routers.courses.support.course_completion_requirements_met",
            return_value=True,
        ),
        patch("app.routers.courses.support._recompute_progress"),
        patch("app.routers.courses.support.issue_membership_certificate"),
        patch("app.services.course_completion_email.send_email") as send,
    ):
        code = _finalize_course_completion(db, user, course, enrollment)
        db.commit()

    assert code.startswith("CAISBE-")
    assert send.call_count == 1
    assert "You've Completed" in send.call_args.kwargs["subject"]
    assert f"/certificates/{code}" in send.call_args.kwargs["html_body"]

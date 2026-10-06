"""In-app notifications: admin broadcasts and automatic student triggers."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import (
    Course,
    Enrollment,
    MembershipCertificate,
    Notification,
    NotificationBroadcast,
    Order,
    OrderItem,
    User,
)
from app.security.auth import hash_password
from app.services.commerce import fulfill_order
from app.services.notifications import (
    ensure_membership_expiry_reminders,
    notify_enrolled_students,
)

STRONG_PASSWORD = "Str0ng-Password!99"


def _student(db: Session, email: str = "member@example.com") -> User:
    user = User(
        full_name="Member One",
        email=email,
        phone="+15555550100",
        country="Canada",
        city="Toronto",
        hashed_password=hash_password(STRONG_PASSWORD),
        role="student",
        membership_type="professional",
        membership_status="active",
        membership_date=datetime.now(timezone.utc),
        email_verified_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _admin(db: Session) -> User:
    admin = User(
        full_name="Admin One",
        email="admin-notify@example.com",
        phone="+15555550999",
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


def test_admin_can_broadcast_announcement_to_all_students(client: TestClient, db: Session) -> None:
    student_a = _student(db, "a@example.com")
    student_b = _student(db, "b@example.com")
    admin = _admin(db)
    token = _login(client, admin.email)

    response = client.post(
        "/api/admin/notifications/send",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "Holiday closure",
            "body": "CAISBE offices are closed for the holiday.",
            "kind": "holiday",
            "link": "/dashboard",
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["recipient_count"] == 2
    assert db.query(NotificationBroadcast).count() == 1

    for user in (student_a, student_b):
        rows = db.query(Notification).filter(Notification.user_id == user.id).all()
        assert len(rows) == 1
        assert rows[0].kind == "holiday"
        assert rows[0].title == "Holiday closure"

    listed = client.get(
        "/api/admin/notifications/broadcasts",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert listed.status_code == 200
    assert listed.json()[0]["title"] == "Holiday closure"


def test_payment_fulfillment_creates_payment_notification(db: Session) -> None:
    user = _student(db)
    order = Order(
        user_id=user.id,
        number="ORD-TEST-1",
        status="pending",
        currency="CAD",
        subtotal_cents=10000,
        discount_cents=0,
        total_cents=10000,
        amount_paid_cents=0,
    )
    db.add(order)
    db.flush()
    db.add(
        OrderItem(
            order_id=order.id,
            membership_type="professional",
            membership_kind="application",
            title="Professional membership",
            unit_price_cents=10000,
            quantity=1,
        )
    )
    db.commit()
    db.refresh(order)

    fulfill_order(db, order)
    db.commit()

    rows = db.query(Notification).filter(Notification.user_id == user.id, Notification.kind == "payment").all()
    assert len(rows) == 1
    assert "Payment received" in rows[0].title
    assert "$100.00" in rows[0].body


def test_course_update_notifies_enrolled_students(db: Session) -> None:
    student = _student(db)
    other = _student(db, "other@example.com")
    course = Course(
        code="FM101",
        slug="fm101",
        title="Facility Basics",
        description="Intro",
        status="published",
        price_cents=0,
    )
    db.add(course)
    db.flush()
    db.add(Enrollment(user_id=student.id, course_id=course.id, status="enrolled", progress=10))
    db.commit()

    notify_enrolled_students(
        db,
        course.id,
        title="Course updated",
        body="New reading added.",
        kind="course_update",
        link=f"/courses/{course.id}",
    )
    db.commit()

    assert (
        db.query(Notification)
        .filter(Notification.user_id == student.id, Notification.kind == "course_update")
        .count()
        == 1
    )
    assert (
        db.query(Notification)
        .filter(Notification.user_id == other.id, Notification.kind == "course_update")
        .count()
        == 0
    )


def test_membership_expiry_reminder_created_once(client: TestClient, db: Session) -> None:
    user = _student(db)
    expires = datetime.now(timezone.utc) + timedelta(days=5)
    db.add(
        MembershipCertificate(
            user_id=user.id,
            membership_type="professional",
            membership_number="CAISBE-M-000001",
            certificate_code="CAISBE-MEM-TEST01",
            issued_at=datetime.now(timezone.utc) - timedelta(days=360),
            expires_at=expires,
        )
    )
    db.commit()

    token = _login(client, user.email)
    first = client.get("/api/me/notifications", headers={"Authorization": f"Bearer {token}"})
    assert first.status_code == 200
    assert any(item["kind"] == "membership_expiry" for item in first.json()["items"])

    second = client.get("/api/me/notifications", headers={"Authorization": f"Bearer {token}"})
    assert second.status_code == 200
    expiry_items = [item for item in second.json()["items"] if item["kind"] == "membership_expiry"]
    assert len(expiry_items) == 1


def test_ensure_membership_expiry_skips_far_future(db: Session) -> None:
    user = _student(db)
    db.add(
        MembershipCertificate(
            user_id=user.id,
            membership_type="professional",
            membership_number="CAISBE-M-000002",
            certificate_code="CAISBE-MEM-TEST02",
            issued_at=datetime.now(timezone.utc),
            expires_at=datetime.now(timezone.utc) + timedelta(days=90),
        )
    )
    db.commit()
    created = ensure_membership_expiry_reminders(db, user)
    assert created == []

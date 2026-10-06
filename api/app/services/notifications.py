"""Create and list in-app student notifications."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.config import settings
from app.models import Enrollment, MembershipCertificate, Notification, NotificationBroadcast, User

MEMBERSHIP_EXPIRY_REMINDER_DAYS = 14

EVENT_TYPE_PATHS = {
    "calendar": "/events/calendar",
    "expo": "/events/expo",
    "conferences": "/events/conferences",
}


def public_site_link(path: str) -> str:
    """Absolute URL on the public marketing site for notification CTAs."""
    base = (settings.web_public_url or "").strip().rstrip("/") or "https://caisbe.org"
    clean = "/" + (path or "").strip().lstrip("/")
    return f"{base}{clean}"


def notify_users(
    db: Session,
    user_ids: set[int] | list[int],
    *,
    title: str,
    body: str,
    kind: str = "info",
    link: str | None = None,
) -> list[Notification]:
    rows: list[Notification] = []
    for user_id in sorted({int(uid) for uid in user_ids}):
        row = Notification(
            user_id=user_id,
            title=title.strip()[:255],
            body=body.strip(),
            kind=(kind or "info").strip()[:40] or "info",
            link=(link or "").strip()[:255] or None,
        )
        db.add(row)
        rows.append(row)
    if rows:
        db.flush()
    return rows


def notify_all_students(
    db: Session,
    *,
    title: str,
    body: str,
    kind: str = "info",
    link: str | None = None,
) -> list[Notification]:
    student_ids = [row[0] for row in db.query(User.id).filter(User.role == "student").all()]
    return notify_users(
        db,
        student_ids,
        title=title,
        body=body,
        kind=kind,
        link=link,
    )


def notify_students_publication(
    db: Session,
    *,
    title: str,
    body: str,
    kind: str,
    path: str,
) -> list[Notification]:
    """Notify every student when public content is newly published."""
    return notify_all_students(
        db,
        title=title,
        body=body,
        kind=kind,
        link=public_site_link(path),
    )


def notify_enrolled_students(
    db: Session,
    course_id: int,
    *,
    title: str,
    body: str,
    kind: str = "course_update",
    link: str | None = None,
) -> list[Notification]:
    user_ids = [
        row[0]
        for row in db.query(Enrollment.user_id)
        .filter(
            Enrollment.course_id == course_id,
            Enrollment.status.notin_(("pending_payment", "revoked")),
        )
        .distinct()
        .all()
    ]
    return notify_users(db, user_ids, title=title, body=body, kind=kind, link=link)


def broadcast_to_students(
    db: Session,
    *,
    title: str,
    body: str,
    kind: str = "announcement",
    link: str | None = None,
    audience: str = "all_students",
    sent_by_id: int | None = None,
) -> NotificationBroadcast:
    rows = notify_all_students(db, title=title, body=body, kind=kind, link=link)
    broadcast = NotificationBroadcast(
        title=title.strip()[:255],
        body=body.strip(),
        kind=(kind or "announcement").strip()[:40] or "announcement",
        link=(link or "").strip()[:255] or None,
        audience=(audience or "all_students").strip()[:40] or "all_students",
        recipient_count=len(rows),
        sent_by_id=sent_by_id,
    )
    db.add(broadcast)
    db.flush()
    return broadcast


def notify_payment_received(
    db: Session,
    user: User,
    *,
    amount_cents: int,
    order_name: str | None = None,
) -> list[Notification]:
    dollars = amount_cents / 100
    label = (order_name or "your order").strip() or "your order"
    return notify_users(
        db,
        [user.id],
        title="Payment received",
        body=f"We received your payment of ${dollars:,.2f} for {label}. Thank you.",
        kind="payment",
        link="/account",
    )


def ensure_membership_expiry_reminders(db: Session, user: User) -> list[Notification]:
    """Create at most one reminder when membership expires within 14 days or has expired."""
    if user.role != "student":
        return []
    cert = (
        db.query(MembershipCertificate)
        .filter(MembershipCertificate.user_id == user.id)
        .first()
    )
    if cert is None or cert.expires_at is None:
        return []

    now = datetime.now(timezone.utc)
    expires = cert.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)

    days_left = (expires.date() - now.date()).days
    if days_left > MEMBERSHIP_EXPIRY_REMINDER_DAYS:
        return []

    expiry_key = expires.date().isoformat()
    link = f"/membership#expiry-{expiry_key}"
    existing = (
        db.query(Notification)
        .filter(
            Notification.user_id == user.id,
            Notification.kind == "membership_expiry",
            Notification.link == link,
        )
        .first()
    )
    if existing is not None:
        return []

    if days_left < 0:
        title = "Membership expired"
        body = (
            f"Your CAISBE membership expired on {expires.strftime('%B %d, %Y')}. "
            "Renew on the Membership page to restore full access."
        )
    elif days_left == 0:
        title = "Membership expires today"
        body = (
            "Your CAISBE membership expires today. "
            "Renew on the Membership page to keep your access."
        )
    else:
        title = "Membership expiry reminder"
        body = (
            f"Your CAISBE membership expires on {expires.strftime('%B %d, %Y')} "
            f"({days_left} day{'s' if days_left != 1 else ''} left). "
            "Renew on the Membership page when you are ready."
        )

    return notify_users(
        db,
        [user.id],
        title=title,
        body=body,
        kind="membership_expiry",
        link=link,
    )


def list_user_notifications(db: Session, user: User, *, limit: int = 50) -> list[Notification]:
    return (
        db.query(Notification)
        .filter(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())
        .limit(max(1, min(limit, 200)))
        .all()
    )


def unread_notification_count(db: Session, user: User) -> int:
    return (
        db.query(Notification)
        .filter(Notification.user_id == user.id, Notification.read_at.is_(None))
        .count()
    )


def mark_notification_read(db: Session, user: User, notification_id: int) -> Notification | None:
    row = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == user.id)
        .first()
    )
    if row is None:
        return None
    if row.read_at is None:
        row.read_at = datetime.now(timezone.utc)
        db.flush()
    return row


def mark_all_notifications_read(db: Session, user: User) -> int:
    now = datetime.now(timezone.utc)
    rows = (
        db.query(Notification)
        .filter(Notification.user_id == user.id, Notification.read_at.is_(None))
        .all()
    )
    for row in rows:
        row.read_at = now
    db.flush()
    return len(rows)

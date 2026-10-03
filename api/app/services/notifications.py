"""Create and list in-app student notifications."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models import Notification, User


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
    student_ids = [
        row[0]
        for row in db.query(User.id).filter(User.role == "student").all()
    ]
    return notify_users(
        db,
        student_ids,
        title=title,
        body=body,
        kind=kind,
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

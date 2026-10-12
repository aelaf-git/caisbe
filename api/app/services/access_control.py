"""Admin grants and restrictions for student accounts, courses, and exams."""

from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import Enrollment, LoginEvent, User

COURSE_RESTRICTED_DETAIL = "CAISBE has restricted access to this course. Contact support."
EXAM_RESTRICTED_DETAIL = "CAISBE has restricted access to this exam. Contact support."
ACCOUNT_SUSPENDED_DETAIL = "Your account is suspended. Contact CAISBE."

ACCESS_VALUES = {"allowed", "restricted"}


def is_restricted(value: str | None) -> bool:
    return (value or "allowed") == "restricted"


def is_suspended(user: User) -> bool:
    return user.suspended_at is not None


def require_course_open(enrollment: Enrollment) -> None:
    if is_restricted(enrollment.course_access):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=COURSE_RESTRICTED_DETAIL)


def require_exam_open(enrollment: Enrollment) -> None:
    if is_restricted(enrollment.exam_access):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=EXAM_RESTRICTED_DETAIL)


def record_login_event(
    db: Session,
    *,
    email: str,
    success: bool,
    reason: str,
    ip_address: str,
    user_id: int | None = None,
) -> LoginEvent:
    row = LoginEvent(
        user_id=user_id,
        email=email.strip().lower()[:255],
        success=success,
        reason=(reason or "")[:64],
        ip_address=(ip_address or "")[:64],
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def set_suspension(db: Session, user: User, suspended: bool) -> User:
    if user.role != "student":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only student accounts can be suspended or activated.",
        )
    user.suspended_at = datetime.now(timezone.utc) if suspended else None
    db.commit()
    db.refresh(user)
    return user

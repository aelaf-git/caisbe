"""Admin grants and restrictions for student accounts, courses, and exams."""

from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import Course, Enrollment, LoginEvent, User

COURSE_RESTRICTED_DETAIL = "CAISBE has restricted access to this course. Contact support."
EXAM_RESTRICTED_DETAIL = (
    "Exam access is pending. After you finish all modules, CAISBE reviews your progress "
    "and grants exam access from the admin dashboard."
)
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


def set_suspension(
    db: Session,
    user: User,
    suspended: bool,
    *,
    reason: str | None = None,
    course_id: int | None = None,
) -> tuple[User, Course | None]:
    """Toggle suspension. Returns the user and the course used for email copy."""
    if user.role != "student":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only student accounts can be suspended or activated.",
        )

    email_course: Course | None = None

    if suspended:
        cleaned = (reason or "").strip()
        if not cleaned:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Enter a reason for the suspension.",
            )
        if course_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Select a course for the suspension notice.",
            )
        enrollment = (
            db.query(Enrollment)
            .filter(Enrollment.user_id == user.id, Enrollment.course_id == course_id)
            .first()
        )
        if enrollment is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The selected course must be one the student is enrolled in.",
            )
        course = db.query(Course).filter(Course.id == course_id).first()
        if course is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Course not found.")
        user.suspended_at = datetime.now(timezone.utc)
        user.suspension_reason = cleaned
        user.suspension_course_id = course.id
        email_course = course
    else:
        if user.suspension_course_id is not None:
            email_course = db.query(Course).filter(Course.id == user.suspension_course_id).first()
        user.suspended_at = None
        user.suspension_reason = None
        user.suspension_course_id = None

    db.commit()
    db.refresh(user)
    return user, email_course

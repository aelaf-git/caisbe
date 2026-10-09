from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.db import get_db
from app.models import Enrollment, LoginEvent, User
from app.schemas.access_control import (
    AccessControlOut,
    AccessEnrollmentOut,
    AccessRestrictionOut,
    AccessUserOut,
    EnrollmentAccessUpdate,
    LoginEventOut,
    SuspensionUpdate,
)
from app.security.auth import require_admin
from app.services.access_control import is_restricted, is_suspended, set_suspension

router = APIRouter(prefix="/admin/access-control", tags=["access-control"])


def _login_locked(user: User, now: datetime) -> bool:
    until = user.login_locked_until
    if until is None:
        return False
    if until.tzinfo is None:
        until = until.replace(tzinfo=timezone.utc)
    return until > now


def _access_value(value: str | None) -> str:
    return "restricted" if is_restricted(value) else "allowed"


def _student_or_404(db: Session, user_id: int) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if user is None or user.role != "student":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    return user


@router.get("", response_model=AccessControlOut)
def access_control_overview(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AccessControlOut:
    now = datetime.now(timezone.utc)
    students = (
        db.query(User)
        .filter(User.role == "student")
        .order_by(User.full_name.asc(), User.id.asc())
        .all()
    )
    enrollments = (
        db.query(Enrollment)
        .options(joinedload(Enrollment.user), joinedload(Enrollment.course))
        .join(User, Enrollment.user_id == User.id)
        .filter(User.role == "student")
        .order_by(Enrollment.enrolled_at.desc(), Enrollment.id.desc())
        .all()
    )
    events = db.query(LoginEvent).order_by(LoginEvent.created_at.desc(), LoginEvent.id.desc()).limit(100).all()

    users = [
        AccessUserOut(
            id=student.id,
            full_name=student.full_name,
            email=student.email,
            membership_type=student.membership_type,
            membership_status=student.membership_status,
            email_verified=student.email_verified_at is not None,
            suspended=is_suspended(student),
            login_locked=_login_locked(student, now),
        )
        for student in students
    ]
    enrollment_rows = [
        AccessEnrollmentOut(
            id=row.id,
            student_id=row.user_id,
            student_name=row.user.full_name if row.user else "",
            student_email=row.user.email if row.user else "",
            course_id=row.course_id,
            course_code=row.course.code if row.course else "",
            course_title=row.course.title if row.course else "",
            status=row.status,
            progress=row.progress,
            course_access=_access_value(row.course_access),  # type: ignore[arg-type]
            exam_access=_access_value(row.exam_access),  # type: ignore[arg-type]
            enrolled_at=row.enrolled_at,
        )
        for row in enrollments
    ]
    restrictions: list[AccessRestrictionOut] = []
    for student in students:
        if is_suspended(student):
            restrictions.append(
                AccessRestrictionOut(
                    kind="account",
                    student_id=student.id,
                    student_name=student.full_name,
                    student_email=student.email,
                    summary="Account suspended",
                )
            )
    for row in enrollment_rows:
        if row.course_access == "restricted":
            restrictions.append(
                AccessRestrictionOut(
                    kind="course",
                    student_id=row.student_id,
                    student_name=row.student_name,
                    student_email=row.student_email,
                    enrollment_id=row.id,
                    summary=f"Course restricted: {row.course_title}",
                )
            )
        if row.exam_access == "restricted":
            restrictions.append(
                AccessRestrictionOut(
                    kind="exam",
                    student_id=row.student_id,
                    student_name=row.student_name,
                    student_email=row.student_email,
                    enrollment_id=row.id,
                    summary=f"Exam restricted: {row.course_title}",
                )
            )
    return AccessControlOut(
        users=users,
        enrollments=enrollment_rows,
        restrictions=restrictions,
        login_events=[LoginEventOut.model_validate(row) for row in events],
    )


@router.patch("/enrollments/{enrollment_id}", response_model=AccessEnrollmentOut)
def update_enrollment_access(
    enrollment_id: int,
    payload: EnrollmentAccessUpdate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AccessEnrollmentOut:
    if payload.course_access is None and payload.exam_access is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Choose course or exam access.")
    row = (
        db.query(Enrollment)
        .options(joinedload(Enrollment.user), joinedload(Enrollment.course))
        .filter(Enrollment.id == enrollment_id)
        .first()
    )
    if row is None or row.user is None or row.user.role != "student":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Enrollment not found")
    if payload.course_access is not None:
        row.course_access = payload.course_access
    if payload.exam_access is not None:
        row.exam_access = payload.exam_access
    db.commit()
    db.refresh(row)
    return AccessEnrollmentOut(
        id=row.id,
        student_id=row.user_id,
        student_name=row.user.full_name,
        student_email=row.user.email,
        course_id=row.course_id,
        course_code=row.course.code if row.course else "",
        course_title=row.course.title if row.course else "",
        status=row.status,
        progress=row.progress,
        course_access=_access_value(row.course_access),  # type: ignore[arg-type]
        exam_access=_access_value(row.exam_access),  # type: ignore[arg-type]
        enrolled_at=row.enrolled_at,
    )


@router.post("/users/{user_id}/suspension", response_model=AccessUserOut)
def update_account_suspension(
    user_id: int,
    payload: SuspensionUpdate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AccessUserOut:
    student = _student_or_404(db, user_id)
    set_suspension(db, student, payload.suspended)
    now = datetime.now(timezone.utc)
    return AccessUserOut(
        id=student.id,
        full_name=student.full_name,
        email=student.email,
        membership_type=student.membership_type,
        membership_status=student.membership_status,
        email_verified=student.email_verified_at is not None,
        suspended=is_suspended(student),
        login_locked=_login_locked(student, now),
    )

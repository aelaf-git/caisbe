"""Membership certificate issue helpers."""

import secrets
from calendar import monthrange
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models import (
    Certificate,
    MembershipApplication,
    MembershipCertificate,
    MembershipCertificateType,
    User,
)

DEFAULT_MEMBERSHIP_CERT_TITLE = "Certificate of Membership"
DEFAULT_MEMBERSHIP_CERT_BODY = "is a recognised member of {issued_by}, admitted on {issued_at}."


def is_student_membership(membership_type: str | None) -> bool:
    return (membership_type or "").strip().lower() == "student"


def student_has_completed_course(db: Session, user_id: int) -> bool:
    return (
        db.query(Certificate.id)
        .filter(Certificate.user_id == user_id)
        .first()
        is not None
    )


def membership_is_accessible(db: Session, user: User) -> bool:
    """Any issued membership certificate is accessible; students always qualify."""
    if is_student_membership(user.membership_type) or user.membership_type:
        return True
    existing = (
        db.query(MembershipCertificate.id)
        .filter(MembershipCertificate.user_id == user.id)
        .first()
    )
    return existing is not None or student_has_completed_course(db, user.id)


def get_membership_certificate_type(
    db: Session,
    membership_type: str | None,
) -> MembershipCertificateType | None:
    if not membership_type:
        return None
    return (
        db.query(MembershipCertificateType)
        .filter(MembershipCertificateType.membership_type == membership_type)
        .first()
    )


def membership_certificate_copy(
    db: Session,
    membership_type: str | None,
) -> tuple[str, str, str | None]:
    """Return (title, body_template, label) for a membership type."""
    row = get_membership_certificate_type(db, membership_type)
    if row:
        return row.title, row.body, row.label
    return DEFAULT_MEMBERSHIP_CERT_TITLE, DEFAULT_MEMBERSHIP_CERT_BODY, None


def add_months(dt: datetime, months: int) -> datetime:
    """Add calendar months, clamping the day to the target month's last day."""
    year = dt.year + (dt.month - 1 + months) // 12
    month = (dt.month - 1 + months) % 12 + 1
    day = min(dt.day, monthrange(year, month)[1])
    return dt.replace(year=year, month=month, day=day)


def compute_expires_at(
    db: Session,
    membership_type: str | None,
    issued_at: datetime,
) -> datetime | None:
    if is_student_membership(membership_type):
        return None
    row = get_membership_certificate_type(db, membership_type)
    months = row.validity_months if row else 12
    if months is None or months <= 0:
        return None
    base = issued_at if issued_at.tzinfo else issued_at.replace(tzinfo=timezone.utc)
    return add_months(base, months)


def issue_membership_certificate(
    db: Session,
    user: User,
    *,
    renew: bool = False,
) -> MembershipCertificate:
    now = datetime.now(timezone.utc)
    existing = (
        db.query(MembershipCertificate)
        .filter(MembershipCertificate.user_id == user.id)
        .first()
    )
    if existing:
        type_changed = (
            user.membership_type
            and existing.membership_type != user.membership_type
        )
        if type_changed or renew:
            existing.membership_type = user.membership_type
            existing.issued_at = now
            existing.expires_at = compute_expires_at(db, user.membership_type, now)
            db.flush()
        elif existing.expires_at is None and not is_student_membership(existing.membership_type):
            existing.expires_at = compute_expires_at(
                db, existing.membership_type, existing.issued_at or now
            )
            db.flush()
        return existing

    membership_number = f"CAISBE-M-{user.id:06d}"
    certificate_code = f"CAISBE-MEM-{secrets.token_hex(4).upper()}"
    while (
        db.query(MembershipCertificate)
        .filter(MembershipCertificate.certificate_code == certificate_code)
        .first()
        is not None
    ):
        certificate_code = f"CAISBE-MEM-{secrets.token_hex(4).upper()}"

    row = MembershipCertificate(
        user_id=user.id,
        membership_type=user.membership_type,
        membership_number=membership_number,
        certificate_code=certificate_code,
        issued_at=now,
        expires_at=compute_expires_at(db, user.membership_type, now),
    )
    db.add(row)
    db.flush()
    return row


def activate_membership(
    db: Session,
    user: User,
    membership_type: str | None,
    *,
    renew: bool = False,
) -> MembershipCertificate:
    """Set the member's type, mark active, and issue or refresh the certificate."""
    now = datetime.now(timezone.utc)
    user.membership_type = membership_type or user.membership_type or "student"
    user.membership_status = "active"
    if user.membership_date is None:
        user.membership_date = now
    return issue_membership_certificate(db, user, renew=renew)


def record_membership_application(
    db: Session,
    user: User,
    *,
    membership_type: str,
    details: str | None = None,
    status_value: str = "active",
) -> MembershipApplication:
    now = datetime.now(timezone.utc)
    row = MembershipApplication(
        user_id=user.id,
        full_name=user.full_name,
        email=user.email,
        phone=user.phone or "",
        country=user.country or "",
        city=user.city or "",
        address=user.address,
        organization=user.organization,
        job_title=user.job_title,
        details=(details or "").strip() or None,
        membership_type=membership_type,
        membership_status=status_value,
        membership_date=now,
    )
    db.add(row)
    db.flush()
    return row


def membership_is_expired(row: MembershipCertificate, now: datetime | None = None) -> bool:
    if row.expires_at is None:
        return False
    current = now or datetime.now(timezone.utc)
    expires = row.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    return expires < current

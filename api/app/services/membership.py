"""Membership certificate issue helpers."""

import secrets
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models import MembershipCertificate, User


def issue_membership_certificate(db: Session, user: User) -> MembershipCertificate:
    existing = (
        db.query(MembershipCertificate)
        .filter(MembershipCertificate.user_id == user.id)
        .first()
    )
    if existing:
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
        membership_number=membership_number,
        certificate_code=certificate_code,
        issued_at=user.created_at or datetime.now(timezone.utc),
    )
    db.add(row)
    db.flush()
    return row

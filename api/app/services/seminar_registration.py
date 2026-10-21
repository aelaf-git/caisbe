"""Email-gated seminar registration and Stripe checkout."""

from __future__ import annotations

import html
import logging
from datetime import datetime, timedelta, timezone
from urllib.parse import quote

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Seminar, SeminarAccessToken, SeminarRegistration
from app.schemas.seminars import (
    ATTENDANCE_OPTIONS,
    MEMBERSHIP_STATUSES,
    POSITION_OPTIONS,
    SeminarRegistrationIn,
)
from app.security.auth import hash_secure_token, new_secure_token
from app.services.email import EmailDeliveryError, send_email
from app.services.email_layout import cta_button, fallback_link, wrap_email_html

logger = logging.getLogger(__name__)

ACCESS_HOURS = 24


def _now() -> datetime:
    return datetime.now(timezone.utc)


def get_published_seminar(db: Session, seminar_id: int) -> Seminar:
    row = (
        db.query(Seminar)
        .filter(Seminar.id == seminar_id, Seminar.published.is_(True))
        .first()
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Seminar not found")
    return row


def registration_open(seminar: Seminar) -> bool:
    if not seminar.registration_enabled:
        return False
    closes = seminar.registration_closes_at
    if closes is not None and closes.tzinfo is None:
        closes = closes.replace(tzinfo=timezone.utc)
    if closes is not None and closes < _now():
        return False
    return True


def price_cents_for(seminar: Seminar, membership_status: str) -> int:
    if membership_status == "association_member":
        return int(seminar.member_price_cents or 0)
    if membership_status == "student":
        return int(seminar.student_price_cents or 0)
    return int(seminar.non_member_price_cents or 0)


def seminar_register_url(seminar_id: int, *, token: str | None = None) -> str:
    base = (settings.web_public_url or "http://localhost:3000").rstrip("/")
    url = f"{base}/professional-development/seminars/{seminar_id}/register"
    if token:
        url = f"{url}?token={quote(token, safe='')}"
    return url


def send_seminar_access_email(*, to: str, seminar_title: str, raw_token: str, seminar_id: int) -> None:
    if settings.is_production and not settings.resend_api_key.strip():
        raise EmailDeliveryError("Email delivery is not configured.")

    access_url = seminar_register_url(seminar_id, token=raw_token)
    if not settings.resend_api_key.strip():
        logger.info("RESEND_API_KEY unset — seminar access link for %s: %s", to, access_url)

    title = html.escape(seminar_title)
    html_body = wrap_email_html(
        f"""
<p style="margin:0 0 14px;">Hello,</p>
<p style="margin:0 0 14px;">Confirm your email to unlock registration for <strong>{title}</strong>.</p>
{cta_button("Continue to registration", access_url)}
{fallback_link(access_url)}
<p style="margin:18px 0 0;font-size:13px;color:#4b5563;">This link expires in {ACCESS_HOURS} hours.</p>
""".strip(),
        heading="Seminar registration access",
        eyebrow="CAISBE Seminars",
    )
    send_email(
        to=to,
        subject=f"Continue registration: {seminar_title}",
        html_body=html_body,
        purpose="system",
        template_key="seminar_access",
        related_type="seminar",
        related_id=seminar_id,
    )


def request_access(db: Session, seminar: Seminar, email: str) -> None:
    if not registration_open(seminar):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration is closed for this seminar.",
        )
    email_norm = email.strip().lower()
    raw_token, token_hash = new_secure_token()
    row = SeminarAccessToken(
        seminar_id=seminar.id,
        email=email_norm,
        token_hash=token_hash,
        expires_at=_now() + timedelta(hours=ACCESS_HOURS),
    )
    db.add(row)
    db.commit()
    send_seminar_access_email(
        to=email_norm,
        seminar_title=seminar.title,
        raw_token=raw_token,
        seminar_id=seminar.id,
    )


def verify_access_token(db: Session, seminar_id: int, raw_token: str) -> SeminarAccessToken:
    token_hash = hash_secure_token(raw_token)
    row = (
        db.query(SeminarAccessToken)
        .filter(
            SeminarAccessToken.seminar_id == seminar_id,
            SeminarAccessToken.token_hash == token_hash,
        )
        .first()
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired access link.")
    expires = row.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires < _now():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This access link has expired.")
    if row.verified_at is None:
        row.verified_at = _now()
        db.commit()
        db.refresh(row)
    return row


def require_verified_access(db: Session, seminar_id: int, raw_token: str) -> SeminarAccessToken:
    row = verify_access_token(db, seminar_id, raw_token)
    if row.verified_at is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email not verified.")
    return row


def _validate_registration_payload(payload: SeminarRegistrationIn) -> None:
    if payload.membership_status not in MEMBERSHIP_STATUSES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid membership status.")
    if payload.attendance not in ATTENDANCE_OPTIONS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid attendance preference.")
    if payload.position not in POSITION_OPTIONS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid position.")
    if payload.position.startswith("Other") and not (payload.position_other or "").strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please specify your position.",
        )
    if payload.membership_status == "association_member" and not (payload.member_id or "").strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Member ID is required for association members.",
        )


def create_registration(
    db: Session,
    seminar: Seminar,
    payload: SeminarRegistrationIn,
) -> tuple[SeminarRegistration, str | None]:
    if not registration_open(seminar):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration is closed for this seminar.",
        )
    access = require_verified_access(db, seminar.id, payload.access_token)
    _validate_registration_payload(payload)
    email_norm = str(payload.email).strip().lower()
    if email_norm != access.email.lower():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email must match the verified address.",
        )

    amount = price_cents_for(seminar, payload.membership_status)
    row = SeminarRegistration(
        seminar_id=seminar.id,
        status="pending_payment",
        first_name=payload.first_name.strip(),
        last_name=payload.last_name.strip(),
        preferred_name=(payload.preferred_name or "").strip() or None,
        email=email_norm,
        phone=payload.phone.strip(),
        job_title=payload.job_title.strip(),
        company=payload.company.strip(),
        city=payload.city.strip(),
        state_province=payload.state_province.strip(),
        country=payload.country.strip(),
        position=payload.position.strip(),
        position_other=(payload.position_other or "").strip() or None,
        membership_status=payload.membership_status,
        member_id=(payload.member_id or "").strip() or None,
        earning_ceu=bool(payload.earning_ceu),
        designations=(payload.designations or "").strip() or None,
        attendance=payload.attendance,
        accommodations=(payload.accommodations or "").strip() or None,
        amount_cents=amount,
        currency="usd",
    )
    db.add(row)
    db.commit()
    db.refresh(row)

    checkout_url = create_seminar_checkout(db, seminar, row)
    return row, checkout_url


def create_seminar_checkout(
    db: Session,
    seminar: Seminar,
    registration: SeminarRegistration,
) -> str | None:
    """Create Stripe Checkout when configured; otherwise mark paid (dev)."""
    if registration.amount_cents <= 0:
        registration.status = "paid"
        registration.paid_at = _now()
        db.commit()
        return None

    if not settings.stripe_secret_key:
        registration.status = "paid"
        registration.paid_at = _now()
        db.commit()
        return None

    import stripe

    stripe.api_key = settings.stripe_secret_key
    web = (settings.web_public_url or "http://localhost:3000").rstrip("/")
    success = (
        f"{web}/professional-development/seminars/{seminar.id}/register/success"
        f"?registration_id={registration.id}&session_id={{CHECKOUT_SESSION_ID}}"
    )
    cancel = seminar_register_url(seminar.id)
    session = stripe.checkout.Session.create(
        mode="payment",
        success_url=success,
        cancel_url=cancel,
        customer_email=registration.email,
        client_reference_id=str(registration.id),
        metadata={
            "seminar_registration_id": str(registration.id),
            "seminar_id": str(seminar.id),
        },
        line_items=[
            {
                "quantity": 1,
                "price_data": {
                    "currency": registration.currency or "usd",
                    "unit_amount": registration.amount_cents,
                    "product_data": {
                        "name": f"{seminar.title} — seminar registration",
                        "description": f"{registration.membership_status.replace('_', ' ').title()} rate",
                    },
                },
            }
        ],
    )
    registration.stripe_session_id = session.id
    db.commit()
    return session.url


def confirm_seminar_payment(db: Session, *, registration_id: int, session_id: str) -> SeminarRegistration:
    row = db.query(SeminarRegistration).filter(SeminarRegistration.id == registration_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Registration not found")
    if row.status == "paid":
        return row
    if row.stripe_session_id and row.stripe_session_id != session_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Session mismatch.")

    if settings.stripe_secret_key:
        import stripe

        stripe.api_key = settings.stripe_secret_key
        session = stripe.checkout.Session.retrieve(session_id)
        payment_status = getattr(session, "payment_status", None)
        if payment_status != "paid":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payment not completed.",
            )
    row.status = "paid"
    row.paid_at = _now()
    row.stripe_session_id = session_id
    db.commit()
    db.refresh(row)
    return row

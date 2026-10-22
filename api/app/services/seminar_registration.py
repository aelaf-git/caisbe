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
    SeminarManageUpdateIn,
    SeminarRegistrationIn,
)
from app.security.auth import hash_secure_token, new_secure_token
from app.services.email import EmailDeliveryError, send_email
from app.services.email_layout import cta_button, detail_box, fallback_link, wrap_email_html
from app.services.seminar_confirmation_email import (
    seminar_manage_url,
    send_seminar_confirmation_email,
    when_label_for,
    where_label_for,
)

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


def send_seminar_access_email(
    *,
    to: str,
    seminar: Seminar,
    requester_name: str,
    raw_token: str,
) -> None:
    if settings.is_production and not settings.resend_api_key.strip():
        raise EmailDeliveryError("Email delivery is not configured.")

    access_url = seminar_register_url(seminar.id, token=raw_token)
    if not settings.resend_api_key.strip():
        logger.info("RESEND_API_KEY unset — seminar access link for %s: %s", to, access_url)

    name = html.escape((requester_name or "").strip() or "Participant")
    title = html.escape((seminar.title or "").strip() or "Seminar")
    date_label, time_label = when_label_for(seminar)
    details = detail_box(
        [
            ("Seminar", (seminar.title or "").strip() or "Seminar"),
            ("Date", date_label),
            ("Time", time_label),
        ],
        title="Event Details at a Glance",
    )
    html_body = wrap_email_html(
        f"""
<p style="margin:0 0 14px;">Dear {name},</p>
<p style="margin:0 0 14px;">
  Thank you for your interest in joining our upcoming seminar, <strong>{title}</strong>.
</p>
<p style="margin:0 0 14px;">
  To secure your seat and confirm whether you will be attending Online or In-Person,
  please finalize your registration by clicking the direct confirmation link below:
</p>
{cta_button("Click Here to Complete Your Registration", access_url)}
{fallback_link(access_url)}
{details}
<p style="margin:18px 0 14px;">
  Please note: Seats are limited based on venue capacity and server bandwidth limits.
  Your registration is not official until you click the link above and submit the final form.
</p>
<p style="margin:0 0 14px;">We look forward to seeing you there!</p>
<p style="margin:0 0 0;font-size:13px;color:#4b5563;">This link expires in {ACCESS_HOURS} hours.</p>
<p style="margin:24px 0 0;">
  Sincerely,<br>
  <strong>The CAISBE Registration Team</strong>
</p>
""".strip(),
        heading="Complete your seminar registration",
        eyebrow="CAISBE Seminars",
        include_signoff=False,
    )
    send_email(
        to=to,
        subject=f"Complete your registration: {(seminar.title or '').strip() or 'Seminar'}",
        html_body=html_body,
        purpose="system",
        template_key="seminar_access",
        related_type="seminar",
        related_id=seminar.id,
    )


def request_access(db: Session, seminar: Seminar, email: str, name: str) -> None:
    if not registration_open(seminar):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration is closed for this seminar.",
        )
    email_norm = email.strip().lower()
    name_clean = (name or "").strip()
    if not name_clean:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Name is required.",
        )
    raw_token, token_hash = new_secure_token()
    row = SeminarAccessToken(
        seminar_id=seminar.id,
        email=email_norm,
        requester_name=name_clean[:120],
        token_hash=token_hash,
        expires_at=_now() + timedelta(hours=ACCESS_HOURS),
    )
    db.add(row)
    db.commit()
    send_seminar_access_email(
        to=email_norm,
        seminar=seminar,
        requester_name=name_clean,
        raw_token=raw_token,
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


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def event_has_started(seminar: Seminar) -> bool:
    starts = seminar.event_starts_at
    if starts is None:
        return False
    return _as_utc(starts) <= _now()


def paid_attendance_count(
    db: Session,
    seminar_id: int,
    attendance: str,
    *,
    exclude_registration_id: int | None = None,
) -> int:
    query = db.query(SeminarRegistration).filter(
        SeminarRegistration.seminar_id == seminar_id,
        SeminarRegistration.attendance == attendance,
        SeminarRegistration.status == "paid",
    )
    if exclude_registration_id is not None:
        query = query.filter(SeminarRegistration.id != exclude_registration_id)
    return query.count()


def ensure_capacity(db: Session, seminar: Seminar, attendance: str, *, exclude_id: int | None = None) -> None:
    if attendance == "in_person" and seminar.capacity_in_person is not None:
        if paid_attendance_count(db, seminar.id, "in_person", exclude_registration_id=exclude_id) >= seminar.capacity_in_person:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="In-person capacity for this seminar is full.",
            )
    if attendance == "virtual" and seminar.capacity_virtual is not None:
        if paid_attendance_count(db, seminar.id, "virtual", exclude_registration_id=exclude_id) >= seminar.capacity_virtual:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Virtual capacity for this seminar is full.",
            )


def finalize_paid_registration(
    db: Session,
    seminar: Seminar,
    registration: SeminarRegistration,
) -> str | None:
    """Ensure paid state, send confirmation once, return raw manage token when newly issued."""
    if registration.status != "paid":
        registration.status = "paid"
        registration.paid_at = registration.paid_at or _now()
        db.commit()
        db.refresh(registration)

    if registration.confirmation_email_sent_at is not None:
        return None

    raw_token, token_hash = new_secure_token()
    registration.manage_token_hash = token_hash
    db.commit()
    db.refresh(registration)
    send_seminar_confirmation_email(
        seminar=seminar,
        registration=registration,
        raw_manage_token=raw_token,
    )
    registration.confirmation_email_sent_at = _now()
    db.commit()
    db.refresh(registration)
    return raw_token


def registration_manage_url(seminar_id: int, raw_token: str | None) -> str | None:
    if not raw_token:
        return None
    return seminar_manage_url(seminar_id, raw_token)


def create_registration(
    db: Session,
    seminar: Seminar,
    payload: SeminarRegistrationIn,
) -> tuple[SeminarRegistration, str | None, str | None]:
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
    ensure_capacity(db, seminar, payload.attendance)

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

    checkout_url, manage_raw = create_seminar_checkout(db, seminar, row)
    return row, checkout_url, manage_raw


def create_seminar_checkout(
    db: Session,
    seminar: Seminar,
    registration: SeminarRegistration,
) -> tuple[str | None, str | None]:
    """Create Stripe Checkout when configured; otherwise mark paid (dev). Returns (checkout_url, manage_raw)."""
    if registration.amount_cents <= 0 or not settings.stripe_secret_key:
        manage_raw = finalize_paid_registration(db, seminar, registration)
        return None, manage_raw

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
    return session.url, None


def confirm_seminar_payment(
    db: Session, *, registration_id: int, session_id: str
) -> tuple[SeminarRegistration, str | None]:
    row = db.query(SeminarRegistration).filter(SeminarRegistration.id == registration_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Registration not found")
    seminar = db.query(Seminar).filter(Seminar.id == row.seminar_id).first()
    if seminar is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Seminar not found")

    if row.status == "paid":
        manage_raw = finalize_paid_registration(db, seminar, row)
        return row, manage_raw
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
    row.stripe_session_id = session_id
    manage_raw = finalize_paid_registration(db, seminar, row)
    return row, manage_raw


def _registration_by_manage_token(db: Session, raw_token: str) -> SeminarRegistration:
    token_hash = hash_secure_token(raw_token)
    row = (
        db.query(SeminarRegistration)
        .filter(SeminarRegistration.manage_token_hash == token_hash)
        .first()
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid management link.")
    if row.status not in {"paid", "cancelled"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Registration is not active yet.")
    return row


def build_manage_out(db: Session, row: SeminarRegistration, *, raw_token: str | None = None) -> dict:
    seminar = db.query(Seminar).filter(Seminar.id == row.seminar_id).first()
    if seminar is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Seminar not found")
    started = event_has_started(seminar)
    cancelled = row.status == "cancelled"
    can_edit = not cancelled and not started
    can_cancel = not cancelled and not started
    online = (seminar.online_join_url or "").strip() or None
    if row.attendance != "virtual":
        online = None
    return {
        "registration_id": row.id,
        "seminar_id": row.seminar_id,
        "status": row.status,
        "ticket_reference": f"#{row.id}",
        "seminar_title": seminar.title,
        "event_date_label": seminar.event_date_label,
        "event_time_label": seminar.event_time_label,
        "where_label": where_label_for(seminar, row.attendance),
        "online_join_url": online,
        "can_edit": can_edit,
        "can_cancel": can_cancel,
        "first_name": row.first_name,
        "last_name": row.last_name,
        "preferred_name": row.preferred_name,
        "email": row.email,
        "phone": row.phone,
        "job_title": row.job_title,
        "company": row.company,
        "city": row.city,
        "state_province": row.state_province,
        "country": row.country,
        "position": row.position,
        "position_other": row.position_other,
        "membership_status": row.membership_status,
        "earning_ceu": row.earning_ceu,
        "designations": row.designations,
        "attendance": row.attendance,
        "accommodations": row.accommodations,
        "amount_cents": row.amount_cents,
        "currency": row.currency,
        "paid_at": row.paid_at,
        "cancelled_at": row.cancelled_at,
        "manage_url": registration_manage_url(seminar.id, raw_token),
    }


def get_manage_registration(db: Session, raw_token: str, *, seminar_id: int | None = None) -> dict:
    row = _registration_by_manage_token(db, raw_token)
    if seminar_id is not None and row.seminar_id != seminar_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid management link.")
    return build_manage_out(db, row, raw_token=raw_token)


def update_manage_registration(db: Session, payload: SeminarManageUpdateIn) -> dict:
    row = _registration_by_manage_token(db, payload.token)
    seminar = db.query(Seminar).filter(Seminar.id == row.seminar_id).first()
    if seminar is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Seminar not found")
    if row.status == "cancelled":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This registration was cancelled.")
    if event_has_started(seminar):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This seminar has already started. Contact support to change your registration.",
        )
    if payload.attendance not in ATTENDANCE_OPTIONS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid attendance preference.")
    if payload.position not in POSITION_OPTIONS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid position.")
    if payload.position.startswith("Other") and not (payload.position_other or "").strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please specify your position.")
    if payload.attendance != row.attendance:
        ensure_capacity(db, seminar, payload.attendance, exclude_id=row.id)

    row.first_name = payload.first_name.strip()
    row.last_name = payload.last_name.strip()
    row.preferred_name = (payload.preferred_name or "").strip() or None
    row.phone = payload.phone.strip()
    row.job_title = payload.job_title.strip()
    row.company = payload.company.strip()
    row.city = payload.city.strip()
    row.state_province = payload.state_province.strip()
    row.country = payload.country.strip()
    row.position = payload.position.strip()
    row.position_other = (payload.position_other or "").strip() or None
    row.earning_ceu = bool(payload.earning_ceu)
    row.designations = (payload.designations or "").strip() or None
    row.attendance = payload.attendance
    row.accommodations = (payload.accommodations or "").strip() or None
    db.commit()
    db.refresh(row)
    return build_manage_out(db, row, raw_token=payload.token)


def cancel_manage_registration(db: Session, raw_token: str) -> dict:
    row = _registration_by_manage_token(db, raw_token)
    seminar = db.query(Seminar).filter(Seminar.id == row.seminar_id).first()
    if seminar is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Seminar not found")
    if row.status == "cancelled":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This registration was already cancelled.")
    if event_has_started(seminar):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This seminar has already started. Contact support to cancel.",
        )
    row.status = "cancelled"
    row.cancelled_at = _now()
    db.commit()
    db.refresh(row)
    return build_manage_out(db, row, raw_token=raw_token)

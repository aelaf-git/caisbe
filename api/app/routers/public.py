from __future__ import annotations

import hmac
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from starlette.datastructures import UploadFile
from sqlalchemy.exc import IntegrityError, OperationalError, ProgrammingError
from sqlalchemy.orm import Session

from app.db import get_db
from app.security.limiter import limiter
from app.models import (
    ContactMessage,
    ContactMessageReply,
    IndustryEvent,
    JobPosting,
    LeadershipPerson,
    MediaAsset,
    MembershipApplication,
    MembershipCertificateType,
    NewsPost,
    NewsletterSubscriber,
    Seminar,
    Testimonial,
    User,
)
from app.schemas.analytics import SiteVisitIn
from app.schemas.contact import ContactMessageIn, ContactMessageOut
from app.schemas.media import (
    MediaAssetOut,
    NewsletterSubscribeIn,
    NewsletterUnsubscribeIn,
    HeroCarouselOut,
    HeroSlideOut,
)
from app.schemas.auth import MembershipApplicationIn, MembershipApplicationOut
from app.schemas.events import IndustryEventOut
from app.schemas.jobs import JobPostingOut
from app.schemas.leadership import LeadershipPersonOut
from app.schemas.membership_certificates import MembershipCertificateTypePublicOut
from app.schemas.news import NewsPostOut
from app.schemas.seminars import (
    SeminarAccessOut,
    SeminarAccessRequestIn,
    SeminarAccessVerifyIn,
    SeminarOut,
    SeminarRegistrationConfirmIn,
    SeminarRegistrationIn,
    SeminarRegistrationOut,
)
from app.schemas.testimonials import TestimonialOut
from app.services import seminar_registration as seminar_reg
from app.services.analytics import record_site_visit
from app.services.commerce import apply_profile_fields, normalize_membership_type
from app.services.email import EmailDeliveryError
from app.services.membership import is_student_membership
from app.services.hero import ensure_default_hero_slides
from app.services.settings import hero_transition_ms
from app.services.translations import localize_many, localize_one

logger = logging.getLogger(__name__)
router = APIRouter(tags=["public"])

VIDEO_EXTENSIONS = {".mp4", ".webm", ".mov", ".m4v"}


def _media_type_from_url(url: str) -> str:
    path = url.split("?")[0].lower()
    if any(path.endswith(ext) for ext in VIDEO_EXTENSIONS):
        return "video"
    return "image"


@router.get("/hero", response_model=HeroCarouselOut)
def get_hero_carousel(
    lang: str = Query(default="en", max_length=12),
    db: Session = Depends(get_db),
) -> HeroCarouselOut:
    ensure_default_hero_slides(db)
    db.commit()
    transition = hero_transition_ms(db)
    rows = (
        db.query(MediaAsset)
        .filter(MediaAsset.published.is_(True), MediaAsset.category == "hero")
        .order_by(MediaAsset.sort_order.asc(), MediaAsset.created_at.asc())
        .all()
    )
    slides = [
        MediaAssetOut.model_validate(row)
        for row in rows
        if row.file_url
    ]
    slides = localize_many(db, "media", slides, lang)
    return HeroCarouselOut(
        transition_ms=transition,
        slides=[
            HeroSlideOut(
                id=item.id,
                title=item.title,
                file_url=item.file_url or "",
                media_type=_media_type_from_url(item.file_url or ""),
                show_text_panel=bool(item.show_text_panel),
                eyebrow=item.eyebrow,
                headline=item.headline,
                subheadline=item.subheadline,
                description=item.description,
                cta_label=item.cta_label,
                cta_url=item.cta_url,
            )
            for item in slides
            if item.file_url
        ],
    )


@router.get("/media", response_model=list[MediaAssetOut])
def list_published_media(
    category: str | None = Query(default=None, max_length=32),
    featured: bool | None = Query(default=None),
    lang: str = Query(default="en", max_length=12),
    db: Session = Depends(get_db),
) -> list[MediaAssetOut]:
    query = db.query(MediaAsset).filter(MediaAsset.published.is_(True))
    if category:
        query = query.filter(MediaAsset.category == category.strip().lower())
    if featured is not None:
        query = query.filter(MediaAsset.featured.is_(featured))
    rows = (
        query.order_by(MediaAsset.sort_order.asc(), MediaAsset.created_at.desc())
        .all()
    )
    return localize_many(db, "media", [MediaAssetOut.model_validate(row) for row in rows], lang)


@router.get("/media/{asset_id}", response_model=MediaAssetOut)
def get_published_media_asset(
    asset_id: int,
    lang: str = Query(default="en", max_length=12),
    db: Session = Depends(get_db),
) -> MediaAssetOut:
    row = (
        db.query(MediaAsset)
        .filter(MediaAsset.id == asset_id, MediaAsset.published.is_(True))
        .first()
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media not found")
    return localize_one(db, "media", MediaAssetOut.model_validate(row), lang)


@router.get("/events", response_model=list[IndustryEventOut])
def list_published_events(
    featured: bool | None = Query(default=None),
    event_type: str | None = Query(default=None, max_length=64),
    lang: str = Query(default="en", max_length=12),
    db: Session = Depends(get_db),
) -> list[IndustryEventOut]:
    query = db.query(IndustryEvent).filter(IndustryEvent.published.is_(True))
    if featured is not None:
        query = query.filter(IndustryEvent.featured.is_(featured))
    if event_type:
        query = query.filter(IndustryEvent.event_type == event_type.strip().lower())
    rows = (
        query.order_by(IndustryEvent.starts_on.asc(), IndustryEvent.sort_order.asc())
        .all()
    )
    return localize_many(db, "event", [IndustryEventOut.model_validate(row) for row in rows], lang)


@router.get("/jobs", response_model=list[JobPostingOut])
def list_active_jobs(
    featured: bool | None = Query(default=None),
    lang: str = Query(default="en", max_length=12),
    db: Session = Depends(get_db),
) -> list[JobPostingOut]:
    """Published jobs that have not reached their expiry date."""
    now = datetime.now(timezone.utc)
    query = db.query(JobPosting).filter(
        JobPosting.published.is_(True),
        JobPosting.expires_on >= now,
    )
    if featured is not None:
        query = query.filter(JobPosting.featured.is_(featured))
    rows = query.order_by(JobPosting.posted_on.desc(), JobPosting.sort_order.asc()).all()
    out: list[JobPostingOut] = []
    for row in rows:
        item = JobPostingOut.model_validate(row)
        item.is_expired = False
        out.append(item)
    return localize_many(db, "job", out, lang)


@router.get("/jobs/{job_id}", response_model=JobPostingOut)
def get_active_job(
    job_id: int,
    lang: str = Query(default="en", max_length=12),
    db: Session = Depends(get_db),
) -> JobPostingOut:
    """Single published job that has not reached its expiry date."""
    now = datetime.now(timezone.utc)
    row = (
        db.query(JobPosting)
        .filter(
            JobPosting.id == job_id,
            JobPosting.published.is_(True),
            JobPosting.expires_on >= now,
        )
        .first()
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    item = JobPostingOut.model_validate(row)
    item.is_expired = False
    return localize_one(db, "job", item, lang)


@router.get("/seminars", response_model=list[SeminarOut])
def list_published_seminars(
    lang: str = Query(default="en", max_length=12),
    db: Session = Depends(get_db),
) -> list[SeminarOut]:
    rows = (
        db.query(Seminar)
        .filter(Seminar.published.is_(True))
        .order_by(Seminar.sort_order.asc(), Seminar.id.asc())
        .all()
    )
    return localize_many(db, "seminar", [SeminarOut.model_validate(row) for row in rows], lang)


@router.get("/seminars/{seminar_id}", response_model=SeminarOut)
def get_published_seminar(
    seminar_id: int,
    lang: str = Query(default="en", max_length=12),
    db: Session = Depends(get_db),
) -> SeminarOut:
    row = seminar_reg.get_published_seminar(db, seminar_id)
    return localize_one(db, "seminar", SeminarOut.model_validate(row), lang)


@router.post("/seminars/{seminar_id}/access")
@limiter.limit("10/minute")
def request_seminar_access(
    request: Request,
    seminar_id: int,
    payload: SeminarAccessRequestIn,
    db: Session = Depends(get_db),
) -> dict[str, str]:
    seminar = seminar_reg.get_published_seminar(db, seminar_id)
    try:
        seminar_reg.request_access(db, seminar, str(payload.email))
    except EmailDeliveryError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    return {
        "message": "Check your email for a link to continue seminar registration.",
    }


@router.post("/seminars/{seminar_id}/access/verify", response_model=SeminarAccessOut)
@limiter.limit("20/minute")
def verify_seminar_access(
    request: Request,
    seminar_id: int,
    payload: SeminarAccessVerifyIn,
    db: Session = Depends(get_db),
) -> SeminarAccessOut:
    seminar_reg.get_published_seminar(db, seminar_id)
    row = seminar_reg.verify_access_token(db, seminar_id, payload.token)
    return SeminarAccessOut(
        email=row.email,
        seminar_id=seminar_id,
        access_token=payload.token,
        message="Email verified. You can complete registration.",
    )


@router.post(
    "/seminars/{seminar_id}/register",
    response_model=SeminarRegistrationOut,
    status_code=status.HTTP_201_CREATED,
)
@limiter.limit("10/minute")
def submit_seminar_registration(
    request: Request,
    seminar_id: int,
    payload: SeminarRegistrationIn,
    db: Session = Depends(get_db),
) -> SeminarRegistrationOut:
    seminar = seminar_reg.get_published_seminar(db, seminar_id)
    row, checkout_url = seminar_reg.create_registration(db, seminar, payload)
    out = SeminarRegistrationOut.model_validate(row)
    out.checkout_url = checkout_url
    return out


@router.post("/seminars/registrations/confirm", response_model=SeminarRegistrationOut)
@limiter.limit("20/minute")
def confirm_seminar_registration_payment(
    request: Request,
    payload: SeminarRegistrationConfirmIn,
    registration_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
) -> SeminarRegistrationOut:
    row = seminar_reg.confirm_seminar_payment(
        db,
        registration_id=registration_id,
        session_id=payload.session_id,
    )
    return SeminarRegistrationOut.model_validate(row)


@router.get("/testimonials", response_model=list[TestimonialOut])
def list_published_testimonials(
    lang: str = Query(default="en", max_length=12),
    db: Session = Depends(get_db),
) -> list[TestimonialOut]:
    rows = (
        db.query(Testimonial)
        .filter(Testimonial.published.is_(True))
        .order_by(Testimonial.sort_order.asc(), Testimonial.id.asc())
        .all()
    )
    return localize_many(db, "testimonial", [TestimonialOut.model_validate(row) for row in rows], lang)


@router.get("/leadership", response_model=list[LeadershipPersonOut])
def list_published_leadership(
    lang: str = Query(default="en", max_length=12),
    db: Session = Depends(get_db),
) -> list[LeadershipPersonOut]:
    rows = (
        db.query(LeadershipPerson)
        .filter(LeadershipPerson.published.is_(True))
        .order_by(LeadershipPerson.sort_order.asc(), LeadershipPerson.id.asc())
        .all()
    )
    return localize_many(
        db,
        "leadership",
        [LeadershipPersonOut.model_validate(row) for row in rows],
        lang,
    )


@router.get("/news", response_model=list[NewsPostOut])
def list_published_news(
    featured: bool | None = Query(default=None),
    lang: str = Query(default="en", max_length=12),
    db: Session = Depends(get_db),
) -> list[NewsPostOut]:
    query = db.query(NewsPost).filter(NewsPost.published.is_(True))
    if featured is not None:
        query = query.filter(NewsPost.featured.is_(featured))
    rows = query.order_by(NewsPost.posted_on.desc(), NewsPost.sort_order.asc()).all()
    return localize_many(db, "news", [NewsPostOut.model_validate(row) for row in rows], lang)


@router.get("/news/{slug}", response_model=NewsPostOut)
def get_published_news(
    slug: str,
    lang: str = Query(default="en", max_length=12),
    db: Session = Depends(get_db),
) -> NewsPostOut:
    row = (
        db.query(NewsPost)
        .filter(NewsPost.slug == slug.strip(), NewsPost.published.is_(True))
        .first()
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="News post not found")
    return localize_one(db, "news", NewsPostOut.model_validate(row), lang)


@router.post("/contact", response_model=ContactMessageOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
def submit_contact_message(
    request: Request,
    payload: ContactMessageIn,
    db: Session = Depends(get_db),
) -> ContactMessageOut:
    try:
        comments = payload.comments.strip()
        row = ContactMessage(
            first_name=payload.first_name.strip(),
            last_name=payload.last_name.strip(),
            company=(payload.company or "").strip() or None,
            job_title=(payload.job_title or "").strip() or None,
            phone=(payload.phone or "").strip() or None,
            email=str(payload.email).lower().strip(),
            help_topic=(payload.help_topic or "").strip() or None,
            comments=comments,
            status="new",
        )
        db.add(row)
        db.flush()
        db.add(
            ContactMessageReply(
                contact_message_id=row.id,
                direction="inbound",
                body=comments,
            )
        )
        db.commit()
        db.refresh(row)
    except (OperationalError, ProgrammingError) as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Contact form is temporarily unavailable. Try again shortly.",
        ) from exc
    try:
        from app.services.email import EmailDeliveryError
        from app.services.request_received_email import send_request_received_email

        send_request_received_email(
            to=row.email,
            full_name=f"{row.first_name} {row.last_name}".strip(),
            related_type="contact_message",
            related_id=row.id,
            db=db,
        )
        db.commit()
    except EmailDeliveryError as exc:
        db.commit()  # keep failed outbound_emails row
        logger.error(
            "Request-received email delivery failed for contact message %s (%s): %s",
            row.id,
            row.email,
            exc,
        )
    except Exception:
        db.rollback()
        logger.exception("Request-received email failed for contact message %s", row.id)
    return ContactMessageOut.model_validate(row)


@router.post("/newsletter/subscribe", status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")
def subscribe_newsletter(
    request: Request,
    payload: NewsletterSubscribeIn,
    db: Session = Depends(get_db),
) -> dict[str, str]:
    email = payload.email.lower().strip()
    welcome_message = "Thank you for subscribing to the CAISBE newsletter."
    subscriber: NewsletterSubscriber | None = None
    already_active = False
    try:
        existing = db.query(NewsletterSubscriber).filter(NewsletterSubscriber.email == email).first()
        if existing:
            subscriber = existing
            if existing.unsubscribed_at is None:
                already_active = True
                welcome_message = "You are already subscribed."
            else:
                existing.unsubscribed_at = None
                existing.subscribed_at = datetime.now(timezone.utc)
                existing.source = "website"
                db.commit()
                db.refresh(existing)
                welcome_message = "Welcome back! You are subscribed again."
        else:
            subscriber = NewsletterSubscriber(
                email=email,
                source="website",
            )
            db.add(subscriber)
            try:
                db.commit()
                db.refresh(subscriber)
            except IntegrityError:
                # Concurrent insert for the same unique email — reuse the existing row.
                db.rollback()
                subscriber = (
                    db.query(NewsletterSubscriber)
                    .filter(NewsletterSubscriber.email == email)
                    .first()
                )
                if subscriber is None:
                    raise
                if subscriber.unsubscribed_at is None:
                    already_active = True
                    welcome_message = "You are already subscribed."
                else:
                    subscriber.unsubscribed_at = None
                    subscriber.subscribed_at = datetime.now(timezone.utc)
                    subscriber.source = "website"
                    db.commit()
                    db.refresh(subscriber)
                    welcome_message = "Welcome back! You are subscribed again."
    except (OperationalError, ProgrammingError) as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Newsletter signup is temporarily unavailable. Try again shortly.",
        ) from exc

    if subscriber is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Newsletter signup is temporarily unavailable. Try again shortly.",
        )

    # Send welcome mail for new/reactivated subscribers, or already-subscribed notice if active.
    try:
        from app.services.email import EmailDeliveryError
        from app.services.newsletter_subscribed_email import (
            send_newsletter_already_subscribed_email,
            send_newsletter_subscribed_email,
        )

        if already_active:
            send_newsletter_already_subscribed_email(to=email, subscriber_id=subscriber.id, db=db)
        else:
            send_newsletter_subscribed_email(to=email, subscriber_id=subscriber.id, db=db)
        db.commit()
    except EmailDeliveryError as exc:
        db.commit()  # keep failed outbound_emails row
        logger.error(
            "Newsletter email delivery failed for %s: %s",
            email,
            exc,
        )
    except Exception:
        db.rollback()
        logger.exception("Newsletter email failed for %s", email)
    return {"message": welcome_message}


@router.post("/newsletter/unsubscribe", status_code=status.HTTP_200_OK)
@limiter.limit("30/minute")
def unsubscribe_newsletter(
    request: Request,
    payload: NewsletterUnsubscribeIn,
    db: Session = Depends(get_db),
) -> dict[str, str]:
    from app.services.newsletter_unsubscribe import (
        make_unsubscribe_token,
        parse_unsubscribe_token,
    )

    parsed = parse_unsubscribe_token(payload.token)
    if parsed is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid unsubscribe link.")
    subscriber_id, _signature = parsed
    row = db.query(NewsletterSubscriber).filter(NewsletterSubscriber.id == subscriber_id).first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid unsubscribe link.")
    expected = make_unsubscribe_token(subscriber_id=row.id, email=row.email)
    if not hmac.compare_digest(payload.token.strip(), expected):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid unsubscribe link.")
    if row.unsubscribed_at is None:
        row.unsubscribed_at = datetime.now(timezone.utc)
        db.commit()
    return {"message": "You have been unsubscribed from the CAISBE newsletter."}


@router.get("/membership/certificate-types", response_model=list[MembershipCertificateTypePublicOut])
def list_public_membership_certificate_types(
    db: Session = Depends(get_db),
) -> list[MembershipCertificateTypePublicOut]:
    rows = (
        db.query(MembershipCertificateType)
        .filter(MembershipCertificateType.active.is_(True))
        .order_by(MembershipCertificateType.sort_order.asc(), MembershipCertificateType.id.asc())
        .all()
    )
    return [MembershipCertificateTypePublicOut.model_validate(row) for row in rows]


@router.post("/membership/apply", response_model=MembershipApplicationOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
def apply_membership(
    request: Request,
    payload: MembershipApplicationIn,
    db: Session = Depends(get_db),
) -> MembershipApplicationOut:
    membership_type = normalize_membership_type(payload.membership_type) or "student"
    email = payload.email.lower().strip()
    user = db.query(User).filter(User.email == email, User.role == "student").first()
    now = datetime.now(timezone.utc)
    # Never elevate live membership from the public form. Paid types wait for portal checkout.
    if user and not is_student_membership(membership_type):
        app_status = "pending_payment"
    else:
        app_status = "pending"
    application = MembershipApplication(
        user_id=user.id if user else None,
        full_name=payload.full_name.strip(),
        email=email,
        phone=payload.phone.strip(),
        country=payload.country.strip(),
        city=payload.city.strip(),
        address=(payload.address or "").strip() or None,
        organization=(payload.organization or "").strip() or None,
        job_title=((payload.job_title or "").strip() or None),
        details=((payload.details or "").strip() or None),
        membership_type=membership_type,
        membership_status=app_status,
        membership_date=now,
    )
    db.add(application)
    if user:
        apply_profile_fields(
            user,
            {
                "full_name": payload.full_name,
                "phone": payload.phone,
                "country": payload.country,
                "city": payload.city,
                "address": payload.address,
                "organization": payload.organization,
                "job_title": (payload.job_title or "")[:120] or None,
            },
        )
    db.commit()
    db.refresh(application)
    return MembershipApplicationOut.model_validate(application)


FORM_UPLOAD_EXTENSIONS = {".pdf", ".doc", ".docx"}
MAX_FORM_UPLOAD_BYTES = 20 * 1024 * 1024


@router.post("/membership/apply-file", response_model=MembershipApplicationOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def apply_membership_file(
    request: Request,
    db: Session = Depends(get_db),
) -> MembershipApplicationOut:
    from app.services.storage import save_upload

    form = await request.form(max_part_size=MAX_FORM_UPLOAD_BYTES)
    uploaded = form.get("file")
    if not isinstance(uploaded, UploadFile):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Choose a completed form to upload.")
    file_url, display = await save_upload(
        uploaded,
        allowed_suffixes=FORM_UPLOAD_EXTENSIONS,
        max_bytes=MAX_FORM_UPLOAD_BYTES,
        folder="membership/forms",
        invalid_detail="Upload a PDF or Word file.",
        empty_detail="Uploaded file is empty.",
        too_large_detail="File is too large. Maximum size is 20 MB.",
    )

    original_name = Path(uploaded.filename or display).name
    display_name = original_name[:120] if len(original_name) >= 2 else "Uploaded form"
    kind = str(form.get("kind") or "application").strip().lower()
    kind_label = "Renewal" if kind == "renewal" else "New membership"
    application = MembershipApplication(
        full_name=display_name,
        email=f"upload-{uuid.uuid4().hex[:12]}@example.com",
        phone="uploaded",
        country="N/A",
        city="N/A",
        job_title=None,
        details=f"{kind_label}\nUploaded form: {original_name}\nFile: {file_url}",
        membership_type="professional",
        membership_status="pending",
        membership_date=datetime.now(timezone.utc),
    )
    db.add(application)
    db.commit()
    db.refresh(application)
    return MembershipApplicationOut.model_validate(application)


@router.post("/analytics/visit", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("60/minute")
def record_public_visit(
    request: Request,
    payload: SiteVisitIn,
    db: Session = Depends(get_db),
) -> None:
    record_site_visit(db, request, payload)

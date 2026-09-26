from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.exc import OperationalError, ProgrammingError
from sqlalchemy.orm import Session

from app.db import get_db
from app.security.limiter import limiter
from app.models import (
    IndustryEvent,
    JobPosting,
    MediaAsset,
    MembershipApplication,
    NewsPost,
    NewsletterSubscriber,
    User,
)
from app.schemas.analytics import SiteVisitIn
from app.schemas.media import MediaAssetOut, NewsletterSubscribeIn, HeroCarouselOut, HeroSlideOut
from app.schemas.auth import MembershipApplicationIn, MembershipApplicationOut
from app.schemas.events import IndustryEventOut
from app.schemas.jobs import JobPostingOut
from app.schemas.news import NewsPostOut
from app.services.analytics import record_site_visit
from app.services.commerce import apply_profile_fields, normalize_membership_type
from app.services.hero import ensure_default_hero_slides
from app.services.settings import hero_transition_ms

router = APIRouter(tags=["public"])

VIDEO_EXTENSIONS = {".mp4", ".webm", ".mov", ".m4v"}


def _media_type_from_url(url: str) -> str:
    path = url.split("?")[0].lower()
    if any(path.endswith(ext) for ext in VIDEO_EXTENSIONS):
        return "video"
    return "image"


@router.get("/hero", response_model=HeroCarouselOut)
def get_hero_carousel(db: Session = Depends(get_db)) -> HeroCarouselOut:
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
        HeroSlideOut(
            id=row.id,
            title=row.title,
            file_url=row.file_url,
            media_type=_media_type_from_url(row.file_url),
        )
        for row in rows
    ]
    return HeroCarouselOut(transition_ms=transition, slides=slides)


@router.get("/media", response_model=list[MediaAssetOut])
def list_published_media(
    category: str | None = Query(default=None, max_length=32),
    featured: bool | None = Query(default=None),
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
    return [MediaAssetOut.model_validate(row) for row in rows]


@router.get("/events", response_model=list[IndustryEventOut])
def list_published_events(
    featured: bool | None = Query(default=None),
    event_type: str | None = Query(default=None, max_length=64),
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
    return [IndustryEventOut.model_validate(row) for row in rows]


@router.get("/jobs", response_model=list[JobPostingOut])
def list_active_jobs(
    featured: bool | None = Query(default=None),
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
    return out


@router.get("/news", response_model=list[NewsPostOut])
def list_published_news(
    featured: bool | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[NewsPostOut]:
    query = db.query(NewsPost).filter(NewsPost.published.is_(True))
    if featured is not None:
        query = query.filter(NewsPost.featured.is_(featured))
    rows = query.order_by(NewsPost.posted_on.desc(), NewsPost.sort_order.asc()).all()
    return [NewsPostOut.model_validate(row) for row in rows]


@router.get("/news/{slug}", response_model=NewsPostOut)
def get_published_news(
    slug: str,
    db: Session = Depends(get_db),
) -> NewsPostOut:
    row = (
        db.query(NewsPost)
        .filter(NewsPost.slug == slug.strip(), NewsPost.published.is_(True))
        .first()
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="News post not found")
    return NewsPostOut.model_validate(row)


@router.post("/newsletter/subscribe", status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")
def subscribe_newsletter(
    request: Request,
    payload: NewsletterSubscribeIn,
    db: Session = Depends(get_db),
) -> dict[str, str]:
    email = payload.email.lower().strip()
    try:
        existing = db.query(NewsletterSubscriber).filter(NewsletterSubscriber.email == email).first()
        if existing:
            if existing.unsubscribed_at is None:
                return {"message": "You are already subscribed."}
            existing.unsubscribed_at = None
            existing.subscribed_at = datetime.now(timezone.utc)
            existing.source = "website"
            db.commit()
            return {"message": "Welcome back! You are subscribed again."}

        subscriber = NewsletterSubscriber(
            email=email,
            source="website",
        )
        db.add(subscriber)
        db.commit()
    except (OperationalError, ProgrammingError) as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Newsletter signup is temporarily unavailable. Try again shortly.",
        ) from exc
    return {"message": "Thank you for subscribing to the CAISBE newsletter."}


@router.post("/membership/apply", response_model=MembershipApplicationOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
def apply_membership(
    request: Request,
    payload: MembershipApplicationIn,
    db: Session = Depends(get_db),
) -> MembershipApplicationOut:
    membership_type = normalize_membership_type(payload.membership_type)
    email = payload.email.lower().strip()
    user = db.query(User).filter(User.email == email, User.role == "student").first()
    now = datetime.now(timezone.utc)
    application = MembershipApplication(
        user_id=user.id if user else None,
        full_name=payload.full_name.strip(),
        email=email,
        phone=payload.phone.strip(),
        country=payload.country.strip(),
        city=payload.city.strip(),
        address=(payload.address or "").strip() or None,
        organization=(payload.organization or "").strip() or None,
        job_title=(payload.job_title or "").strip() or None,
        membership_type=membership_type or "student",
        membership_status="pending",
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
                "job_title": payload.job_title,
                "membership_type": membership_type,
            },
        )
        if user.membership_status == "pending":
            user.membership_status = "pending"
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

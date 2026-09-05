from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.limiter import limiter
from app.models import MediaAsset, NewsletterSubscriber
from app.schemas.analytics import SiteVisitIn
from app.schemas.media import MediaAssetOut, NewsletterSubscribeIn
from app.services.analytics import record_site_visit

router = APIRouter(tags=["public"])


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


@router.post("/newsletter/subscribe", status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")
def subscribe_newsletter(
    request: Request,
    payload: NewsletterSubscribeIn,
    db: Session = Depends(get_db),
) -> dict[str, str]:
    email = payload.email.lower().strip()
    existing = db.query(NewsletterSubscriber).filter(NewsletterSubscriber.email == email).first()
    if existing:
        if existing.unsubscribed_at is None:
            return {"message": "You are already subscribed."}
        existing.unsubscribed_at = None
        existing.subscribed_at = datetime.now(timezone.utc)
        if payload.full_name:
            existing.full_name = payload.full_name.strip()
        existing.source = "website"
        db.commit()
        return {"message": "Welcome back! You are subscribed again."}

    subscriber = NewsletterSubscriber(
        email=email,
        full_name=payload.full_name.strip() if payload.full_name else None,
        source="website",
    )
    db.add(subscriber)
    db.commit()
    return {"message": "Thank you for subscribing to the CAISBE newsletter."}


@router.post("/analytics/visit", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("60/minute")
def record_public_visit(
    request: Request,
    payload: SiteVisitIn,
    db: Session = Depends(get_db),
) -> None:
    record_site_visit(db, request, payload)

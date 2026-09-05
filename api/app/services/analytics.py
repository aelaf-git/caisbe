from __future__ import annotations

from collections import Counter
from datetime import datetime, timedelta, timezone

from fastapi import Request
from sqlalchemy.orm import Session

from app.models import SiteVisit
from app.schemas.analytics import (
    SiteVisitCountryStatOut,
    SiteVisitIn,
    SiteVisitPathStatOut,
    SiteVisitStatsOut,
)


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()[:64]
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()[:64]
    if request.client and request.client.host:
        return request.client.host[:64]
    return "unknown"


def request_country(request: Request) -> str | None:
    for header in (
        "cf-ipcountry",
        "x-vercel-ip-country",
        "cloudfront-viewer-country",
        "x-country-code",
    ):
        value = (request.headers.get(header) or "").strip().upper()
        if value and value != "XX":
            return value[:64]
    return None


def normalize_path(raw: str | None) -> str:
    path = (raw or "/").strip() or "/"
    if not path.startswith("/"):
        path = f"/{path}"
    return path[:512]


def record_site_visit(db: Session, request: Request, payload: SiteVisitIn) -> None:
    path = normalize_path(payload.path)
    ip = client_ip(request)
    now = datetime.now(timezone.utc)
    recent = (
        db.query(SiteVisit.id)
        .filter(
            SiteVisit.ip_address == ip,
            SiteVisit.path == path,
            SiteVisit.visited_at >= now - timedelta(minutes=2),
        )
        .first()
    )
    if recent:
        return

    visit = SiteVisit(
        path=path,
        ip_address=ip,
        country=request_country(request),
        city=(payload.city or "").strip()[:120] or None,
        referrer=(payload.referrer or "").strip()[:1024] or None,
        user_agent=(request.headers.get("user-agent") or "")[:512] or None,
        language=(payload.language or request.headers.get("accept-language") or "")[:64] or None,
        timezone=(payload.timezone or "").strip()[:64] or None,
    )
    db.add(visit)
    db.commit()


def site_visit_stats(db: Session) -> SiteVisitStatsOut:
    now = datetime.now(timezone.utc)
    start_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    start_week = now - timedelta(days=7)

    rows = db.query(SiteVisit).all()
    landing = [row for row in rows if row.path == "/"]
    today = [row for row in rows if row.visited_at and row.visited_at >= start_today]
    week = [row for row in rows if row.visited_at and row.visited_at >= start_week]

    path_counts = Counter(row.path for row in rows)
    country_counts = Counter(row.country or "Unknown" for row in rows)

    return SiteVisitStatsOut(
        total_views=len(rows),
        unique_visitors=len({row.ip_address for row in rows}),
        landing_views=len(landing),
        landing_unique_visitors=len({row.ip_address for row in landing}),
        views_today=len(today),
        unique_today=len({row.ip_address for row in today}),
        views_last_7_days=len(week),
        unique_last_7_days=len({row.ip_address for row in week}),
        top_paths=[
            SiteVisitPathStatOut(path=path, views=count)
            for path, count in path_counts.most_common(8)
        ],
        top_countries=[
            SiteVisitCountryStatOut(country=country, views=count)
            for country, count in country_counts.most_common(8)
        ],
    )

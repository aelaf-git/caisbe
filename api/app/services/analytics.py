from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta, timezone
from urllib.parse import unquote, urlparse

from fastapi import Request
from sqlalchemy.orm import Session

from app.models import SiteVisit
from app.schemas.analytics import (
    SiteVisitCountryStatOut,
    SiteVisitDailyOut,
    SiteVisitIn,
    SiteVisitNamedStatOut,
    SiteVisitPathStatOut,
    SiteVisitStatsOut,
)
from app.services.geo_labels import ISO_COUNTRIES, TIMEZONE_COUNTRIES


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


def request_city(request: Request) -> str | None:
    for header in ("cf-ipcity", "x-vercel-ip-city"):
        value = unquote((request.headers.get(header) or "").strip())
        if value and value.upper() not in {"XX", "UNKNOWN"}:
            return value[:120]
    return None


def normalize_path(raw: str | None) -> str:
    path = (raw or "/").strip() or "/"
    if not path.startswith("/"):
        path = f"/{path}"
    return path[:512]


def display_country(country: str | None, timezone_name: str | None) -> str:
    raw = (country or "").strip()
    if raw and raw.upper() not in {"XX", "UNKNOWN", "T1"}:
        if len(raw) == 2 and raw.isalpha():
            return ISO_COUNTRIES.get(raw.upper(), raw.upper())
        return raw
    mapped = TIMEZONE_COUNTRIES.get((timezone_name or "").strip())
    if mapped and mapped != "Unknown":
        return mapped
    return "Unknown"


def display_city(city: str | None, timezone_name: str | None) -> str:
    stored = (city or "").strip()
    if stored and stored.casefold() not in {"unknown", "xx"}:
        return stored
    zone = (timezone_name or "").strip()
    if not zone or zone.upper() in {"UTC", "GMT"} or zone.startswith("Etc/"):
        return "Unknown"
    label = zone.split("/")[-1].replace("_", " ").strip()
    if not label or label.upper() in {"UTC", "GMT"}:
        return "Unknown"
    return label[:120]


def browser_name(user_agent: str | None) -> str:
    agent = user_agent or ""
    if "Edg/" in agent:
        return "Edge"
    if "Chrome/" in agent:
        return "Chrome"
    if "Firefox/" in agent:
        return "Firefox"
    if "Safari/" in agent and "Chrome" not in agent:
        return "Safari"
    if not agent:
        return "Other"
    return "Other"


def referrer_label(referrer: str | None) -> str:
    value = (referrer or "").strip()
    if not value:
        return "Direct"
    parsed = urlparse(value if "://" in value else f"https://{value}")
    host = (parsed.netloc or parsed.path or value).lower()
    if host.startswith("www."):
        host = host[4:]
    return host[:80] or "Direct"


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
        city=(payload.city or "").strip()[:120] or request_city(request),
        referrer=(payload.referrer or "").strip()[:1024] or None,
        user_agent=(request.headers.get("user-agent") or "")[:512] or None,
        language=(payload.language or request.headers.get("accept-language") or "")[:64] or None,
        timezone=(payload.timezone or "").strip()[:64] or None,
    )
    db.add(visit)
    db.commit()


def _aware(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def _day_key(value: datetime) -> str:
    return _aware(value).astimezone(timezone.utc).date().isoformat()


def _ranked_named(views: dict[str, int], ips: dict[str, set[str]], limit: int = 8) -> list[SiteVisitNamedStatOut]:
    ranked = sorted(views.items(), key=lambda item: (-item[1], item[0]))
    return [
        SiteVisitNamedStatOut(label=label, views=count, unique=len(ips.get(label, set())))
        for label, count in ranked[:limit]
    ]


def site_visit_stats(db: Session, days: int | None = None) -> SiteVisitStatsOut:
    now = datetime.now(timezone.utc)
    start_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    start_week = now - timedelta(days=7)

    rows = db.query(SiteVisit).all()
    today = [row for row in rows if row.visited_at and _aware(row.visited_at) >= start_today]
    week = [row for row in rows if row.visited_at and _aware(row.visited_at) >= start_week]

    window_start = now - timedelta(days=days) if days else None
    previous_start = now - timedelta(days=days * 2) if days else None

    def in_window(row: SiteVisit, start: datetime | None, end: datetime | None = None) -> bool:
        if row.visited_at is None:
            return False
        stamp = _aware(row.visited_at)
        if start and stamp < start:
            return False
        if end and stamp >= end:
            return False
        return True

    scoped = [row for row in rows if in_window(row, window_start)]
    previous = (
        [row for row in rows if in_window(row, previous_start, window_start)]
        if days and previous_start and window_start
        else []
    )
    landing = [row for row in scoped if row.path == "/"]

    path_counts: dict[str, int] = defaultdict(int)
    country_views: dict[str, int] = defaultdict(int)
    country_ips: dict[str, set[str]] = defaultdict(set)
    city_views: dict[str, int] = defaultdict(int)
    city_ips: dict[str, set[str]] = defaultdict(set)
    referrer_views: dict[str, int] = defaultdict(int)
    referrer_ips: dict[str, set[str]] = defaultdict(set)
    browser_views: dict[str, int] = defaultdict(int)
    browser_ips: dict[str, set[str]] = defaultdict(set)
    daily_views: dict[str, int] = defaultdict(int)
    daily_ips: dict[str, set[str]] = defaultdict(set)

    for row in scoped:
        path_counts[row.path] += 1
        country = display_country(row.country, row.timezone)
        country_views[country] += 1
        country_ips[country].add(row.ip_address)
        city = display_city(row.city, row.timezone)
        city_views[city] += 1
        city_ips[city].add(row.ip_address)
        referrer = referrer_label(row.referrer)
        referrer_views[referrer] += 1
        referrer_ips[referrer].add(row.ip_address)
        browser = browser_name(row.user_agent)
        browser_views[browser] += 1
        browser_ips[browser].add(row.ip_address)
        if row.visited_at:
            key = _day_key(row.visited_at)
            daily_views[key] += 1
            daily_ips[key].add(row.ip_address)

    chart_days = days or 90
    if days is None and scoped:
        first = min(_aware(row.visited_at) for row in scoped if row.visited_at)
        span = max(1, (now.date() - first.date()).days + 1)
        chart_days = min(90, span)
    daily: list[SiteVisitDailyOut] = []
    for offset in range(chart_days - 1, -1, -1):
        day = (now - timedelta(days=offset)).date().isoformat()
        daily.append(
            SiteVisitDailyOut(
                date=day,
                views=daily_views.get(day, 0),
                unique=len(daily_ips.get(day, set())),
            )
        )

    countries = [
        SiteVisitCountryStatOut(country=country, views=count, unique=len(country_ips.get(country, set())))
        for country, count in sorted(country_views.items(), key=lambda item: (-item[1], item[0]))
    ]

    return SiteVisitStatsOut(
        total_views=len(scoped),
        unique_visitors=len({row.ip_address for row in scoped}),
        landing_views=len(landing),
        landing_unique_visitors=len({row.ip_address for row in landing}),
        views_today=len(today),
        unique_today=len({row.ip_address for row in today}),
        views_last_7_days=len(week),
        unique_last_7_days=len({row.ip_address for row in week}),
        previous_views=len(previous) if days else None,
        previous_unique=len({row.ip_address for row in previous}) if days else None,
        top_paths=[
            SiteVisitPathStatOut(path=path, views=count)
            for path, count in sorted(path_counts.items(), key=lambda item: (-item[1], item[0]))[:8]
        ],
        top_countries=countries[:8],
        daily=daily,
        countries=countries[:12],
        cities=_ranked_named(city_views, city_ips),
        referrers=_ranked_named(referrer_views, referrer_ips),
        browsers=_ranked_named(browser_views, browser_ips),
    )

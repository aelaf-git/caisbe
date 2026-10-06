"""Automatic job board sync from curated feed and public aggregators."""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from html import unescape
from pathlib import Path
from typing import Any

import httpx
from sqlalchemy.orm import Session

from app.config import settings
from app.models import JobPosting

logger = logging.getLogger(__name__)

CURATED_FEED_PATH = Path(__file__).resolve().parents[1] / "data" / "job_feed.json"
SOURCE_CURATED = "caisbe_feed"
SOURCE_ADZUNA = "adzuna"
SOURCE_ARBEITNOW = "arbeitnow"

TITLE_PATTERN = re.compile(
    r"\b("
    r"facilit(?:y|ies)\s+(?:manager|management|coordinator|engineer|director|supervisor)|"
    r"director\s+of\s+facilit(?:y|ies)|"
    r"property\s+(?:manager|management)|"
    r"building\s+(?:manager|engineer|operations)|"
    r"estate\s+manager|"
    r"hvac\s+(?:technician|engineer|manager)|"
    r"maintenance\s+manager|"
    r"workplace\s+(?:experience|manager)"
    r")\b",
    re.IGNORECASE,
)


@dataclass
class JobDraft:
    source_label: str
    external_id: str
    title: str
    company: str | None
    location: str | None
    employment_type: str
    summary: str | None
    description: str | None
    apply_url: str | None
    posted_on: datetime
    expires_on: datetime


@dataclass
class JobSyncResult:
    created: int = 0
    updated: int = 0
    skipped: int = 0
    sources: list[str] | None = None
    errors: list[str] | None = None

    def as_dict(self) -> dict[str, Any]:
        return {
            "created": self.created,
            "updated": self.updated,
            "skipped": self.skipped,
            "sources": self.sources or [],
            "errors": self.errors or [],
        }


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _strip_html(value: str | None, *, limit: int = 4000) -> str | None:
    if not value:
        return None
    text = re.sub(r"<[^>]+>", " ", value)
    text = unescape(re.sub(r"\s+", " ", text)).strip()
    if not text:
        return None
    return text[:limit]


def _normalize_employment_type(value: str | None) -> str:
    raw = (value or "full-time").strip().lower().replace("_", "-").replace(" ", "-")
    aliases = {
        "fulltime": "full-time",
        "full-time": "full-time",
        "parttime": "part-time",
        "part-time": "part-time",
        "contract": "contract",
        "temporary": "contract",
        "internship": "internship",
        "freelance": "contract",
        "permanent": "full-time",
    }
    return aliases.get(raw, raw[:64] or "full-time")


def upsert_job_draft(db: Session, draft: JobDraft) -> str:
    """Insert or update a synced job. Returns created|updated|skipped."""
    if not draft.external_id or not draft.title.strip():
        return "skipped"
    row = (
        db.query(JobPosting)
        .filter(
            JobPosting.source_label == draft.source_label,
            JobPosting.external_id == draft.external_id,
        )
        .first()
    )
    if row is None:
        row = JobPosting(
            source_label=draft.source_label,
            external_id=draft.external_id,
            title=draft.title.strip()[:255],
            company=(draft.company or "").strip()[:160] or None,
            location=(draft.location or "").strip()[:255] or None,
            employment_type=_normalize_employment_type(draft.employment_type),
            summary=draft.summary,
            description=draft.description,
            apply_url=(draft.apply_url or "").strip()[:1024] or None,
            posted_on=draft.posted_on,
            expires_on=draft.expires_on,
            published=True,
            featured=False,
            sort_order=0,
        )
        db.add(row)
        db.flush()
        return "created"

    changed = False
    mapping = {
        "title": draft.title.strip()[:255],
        "company": (draft.company or "").strip()[:160] or None,
        "location": (draft.location or "").strip()[:255] or None,
        "employment_type": _normalize_employment_type(draft.employment_type),
        "summary": draft.summary,
        "description": draft.description,
        "apply_url": (draft.apply_url or "").strip()[:1024] or None,
        "published": True,
    }
    for key, value in mapping.items():
        if getattr(row, key) != value:
            setattr(row, key, value)
            changed = True
    # Preserve posted_on / expires_on on updates so scheduled syncs stay idempotent.
    if changed:
        db.flush()
        return "updated"
    return "skipped"


def _expiry_from(posted: datetime) -> datetime:
    days = max(7, int(settings.job_sync_expiry_days or 45))
    return posted + timedelta(days=days)


def _load_json(path: Path) -> list[dict[str, Any]]:
    import json

    if not path.is_file():
        return []
    data = json.loads(path.read_text(encoding="utf-8"))
    return data if isinstance(data, list) else []


def fetch_curated_drafts() -> list[JobDraft]:
    now = _now()
    drafts: list[JobDraft] = []
    for item in _load_json(CURATED_FEED_PATH):
        external_id = str(item.get("external_id") or "").strip()
        title = str(item.get("title") or "").strip()
        if not external_id or not title:
            continue
        posted = now
        drafts.append(
            JobDraft(
                source_label=SOURCE_CURATED,
                external_id=external_id,
                title=title,
                company=(str(item.get("company") or "").strip() or None),
                location=(str(item.get("location") or "").strip() or None),
                employment_type=str(item.get("employment_type") or "full-time"),
                summary=_strip_html(str(item.get("summary") or "") or None, limit=4000),
                description=_strip_html(str(item.get("description") or "") or None, limit=20000),
                apply_url=(str(item.get("apply_url") or "").strip() or None),
                posted_on=posted,
                expires_on=_expiry_from(posted),
            )
        )
    return drafts


def fetch_remote_feed_drafts(client: httpx.Client) -> list[JobDraft]:
    url = (settings.job_feed_url or "").strip()
    if not url:
        return []
    response = client.get(url, timeout=30.0)
    response.raise_for_status()
    payload = response.json()
    rows = payload if isinstance(payload, list) else payload.get("jobs") or []
    now = _now()
    drafts: list[JobDraft] = []
    for item in rows:
        if not isinstance(item, dict):
            continue
        external_id = str(item.get("external_id") or item.get("id") or "").strip()
        title = str(item.get("title") or "").strip()
        if not external_id or not title:
            continue
        posted = now
        drafts.append(
            JobDraft(
                source_label="feed",
                external_id=external_id[:160],
                title=title,
                company=(str(item.get("company") or "").strip() or None),
                location=(str(item.get("location") or "").strip() or None),
                employment_type=str(item.get("employment_type") or "full-time"),
                summary=_strip_html(str(item.get("summary") or item.get("description") or "") or None),
                description=_strip_html(str(item.get("description") or "") or None, limit=20000),
                apply_url=(str(item.get("apply_url") or item.get("url") or "").strip() or None),
                posted_on=posted,
                expires_on=_expiry_from(posted),
            )
        )
    return drafts


def fetch_adzuna_drafts(client: httpx.Client) -> list[JobDraft]:
    app_id = (settings.adzuna_app_id or "").strip()
    app_key = (settings.adzuna_app_key or "").strip()
    if not app_id or not app_key:
        return []
    country = (settings.adzuna_country or "ca").strip().lower() or "ca"
    drafts: list[JobDraft] = []
    queries = [
        "facility manager",
        "facilities manager",
        "property manager",
        "building engineer",
        "facilities management",
    ]
    for query in queries:
        url = f"https://api.adzuna.com/v1/api/jobs/{country}/search/1"
        response = client.get(
            url,
            params={
                "app_id": app_id,
                "app_key": app_key,
                "results_per_page": 20,
                "what": query,
                "content-type": "application/json",
            },
            timeout=30.0,
        )
        response.raise_for_status()
        results = response.json().get("results") or []
        for item in results:
            if not isinstance(item, dict):
                continue
            external_id = str(item.get("id") or "").strip()
            title = str(item.get("title") or "").strip()
            if not external_id or not title:
                continue
            if not TITLE_PATTERN.search(title):
                continue
            company = None
            company_obj = item.get("company")
            if isinstance(company_obj, dict):
                company = str(company_obj.get("display_name") or "").strip() or None
            location = None
            location_obj = item.get("location")
            if isinstance(location_obj, dict):
                location = str(location_obj.get("display_name") or "").strip() or None
            created = item.get("created")
            try:
                posted = (
                    datetime.fromisoformat(str(created).replace("Z", "+00:00"))
                    if created
                    else _now()
                )
            except ValueError:
                posted = _now()
            if posted.tzinfo is None:
                posted = posted.replace(tzinfo=timezone.utc)
            drafts.append(
                JobDraft(
                    source_label=SOURCE_ADZUNA,
                    external_id=external_id[:160],
                    title=title,
                    company=company,
                    location=location,
                    employment_type=str(item.get("contract_time") or item.get("contract_type") or "full-time"),
                    summary=_strip_html(str(item.get("description") or "") or None),
                    description=_strip_html(str(item.get("description") or "") or None, limit=20000),
                    apply_url=(str(item.get("redirect_url") or "").strip() or None),
                    posted_on=posted,
                    expires_on=_expiry_from(posted),
                )
            )
    # Dedupe by external id within this batch
    unique: dict[str, JobDraft] = {d.external_id: d for d in drafts}
    return list(unique.values())


def fetch_arbeitnow_drafts(client: httpx.Client) -> list[JobDraft]:
    drafts: list[JobDraft] = []
    for page in range(1, 4):
        response = client.get(
            "https://www.arbeitnow.com/api/job-board-api",
            params={"page": page},
            timeout=30.0,
        )
        response.raise_for_status()
        rows = response.json().get("data") or []
        if not rows:
            break
        for item in rows:
            if not isinstance(item, dict):
                continue
            title = str(item.get("title") or "").strip()
            if not title or not TITLE_PATTERN.search(title):
                continue
            slug = str(item.get("slug") or item.get("url") or title).strip()
            created = item.get("created_at")
            if isinstance(created, (int, float)):
                posted = datetime.fromtimestamp(created, tz=timezone.utc)
            else:
                posted = _now()
            drafts.append(
                JobDraft(
                    source_label=SOURCE_ARBEITNOW,
                    external_id=slug[:160],
                    title=title,
                    company=(str(item.get("company_name") or "").strip() or None),
                    location=(str(item.get("location") or "").strip() or None),
                    employment_type="full-time" if item.get("remote") else "full-time",
                    summary=_strip_html(str(item.get("description") or "") or None),
                    description=_strip_html(str(item.get("description") or "") or None, limit=20000),
                    apply_url=(str(item.get("url") or "").strip() or None),
                    posted_on=posted,
                    expires_on=_expiry_from(posted),
                )
            )
    unique: dict[str, JobDraft] = {d.external_id: d for d in drafts}
    return list(unique.values())


def sync_jobs(db: Session, *, client: httpx.Client | None = None) -> JobSyncResult:
    result = JobSyncResult(sources=[], errors=[])
    owns_client = client is None
    http = client or httpx.Client(headers={"User-Agent": "caisbe-job-sync/1.0"}, follow_redirects=True)
    try:
        batches: list[tuple[str, list[JobDraft]]] = [("curated", fetch_curated_drafts())]
        try:
            feed = fetch_remote_feed_drafts(http)
            if feed:
                batches.append(("feed", feed))
        except Exception as exc:  # noqa: BLE001 — isolate source failures
            result.errors.append(f"feed: {exc}")
            logger.warning("Job feed sync failed: %s", exc)
        try:
            adzuna = fetch_adzuna_drafts(http)
            if adzuna:
                batches.append(("adzuna", adzuna))
        except Exception as exc:  # noqa: BLE001
            result.errors.append(f"adzuna: {exc}")
            logger.warning("Adzuna sync failed: %s", exc)
        try:
            arbeitnow = fetch_arbeitnow_drafts(http)
            if arbeitnow:
                batches.append(("arbeitnow", arbeitnow))
        except Exception as exc:  # noqa: BLE001
            result.errors.append(f"arbeitnow: {exc}")
            logger.warning("Arbeitnow sync failed: %s", exc)

        for source_name, drafts in batches:
            if not drafts:
                continue
            result.sources.append(source_name)
            for draft in drafts:
                action = upsert_job_draft(db, draft)
                if action == "created":
                    result.created += 1
                elif action == "updated":
                    result.updated += 1
                else:
                    result.skipped += 1
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        if owns_client:
            http.close()
    return result

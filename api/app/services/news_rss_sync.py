"""Sync industry RSS feeds into NewsPost external-link cards."""

from __future__ import annotations

import hashlib
import logging
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from html import unescape
from typing import Any
from xml.etree import ElementTree as ET

import httpx
from sqlalchemy.orm import Session

from app.config import settings
from app.models import NewsPost
from app.schemas.news import slugify_title

logger = logging.getLogger(__name__)

SOURCE_FACILITIES_DIVE = "facilities_dive"
SOURCE_FACILITIESNET = "facilitiesnet"

RSS_SOURCES: dict[str, str] = {
    SOURCE_FACILITIES_DIVE: "Facilities Dive",
    SOURCE_FACILITIESNET: "FacilitiesNet",
}

USER_AGENT = "caisbe-news-rss/1.0 (+https://caisbe.org)"

_IMG_SRC_RE = re.compile(
    r'<img[^>]+src=["\']([^"\']+)["\']',
    re.IGNORECASE,
)
_TAG_RE = re.compile(r"<[^>]+>")


@dataclass
class RssItem:
    title: str
    link: str
    summary: str | None
    image_url: str | None
    posted_on: datetime
    guid: str | None = None


@dataclass
class NewsRssSyncResult:
    created: int = 0
    updated: int = 0
    skipped: int = 0
    sources: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def as_dict(self) -> dict[str, Any]:
        return {
            "created": self.created,
            "updated": self.updated,
            "skipped": self.skipped,
            "sources": list(self.sources),
            "errors": list(self.errors),
        }


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _strip_html(value: str | None, *, limit: int = 500) -> str | None:
    if not value:
        return None
    text = _TAG_RE.sub(" ", unescape(value))
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        return None
    return text[:limit]


def _local(tag: str) -> str:
    if "}" in tag:
        return tag.rsplit("}", 1)[-1]
    return tag


def _child_text(parent: ET.Element, names: set[str]) -> str | None:
    for child in parent:
        if _local(child.tag).lower() in names:
            text = (child.text or "").strip()
            if text:
                return text
            # Some feeds put CDATA / nested text only in itertext
            joined = "".join(child.itertext()).strip()
            if joined:
                return joined
    return None


def _parse_pubdate(raw: str | None) -> datetime:
    if raw:
        try:
            dt = parsedate_to_datetime(raw)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.astimezone(timezone.utc)
        except (TypeError, ValueError, IndexError, OverflowError):
            pass
    return _now()


def _extract_image(item: ET.Element, description: str | None) -> str | None:
    for child in item:
        local = _local(child.tag).lower()
        if local == "content" and child.attrib.get("url"):
            return child.attrib["url"].strip()
        if local == "thumbnail" and child.attrib.get("url"):
            return child.attrib["url"].strip()
        if local == "image":
            url = _child_text(child, {"url"})
            if url:
                return url.strip()
            if (child.text or "").strip().startswith("http"):
                return child.text.strip()
        if local == "enclosure":
            url = (child.attrib.get("url") or "").strip()
            mime = (child.attrib.get("type") or "").lower()
            if url and (mime.startswith("image/") or url.lower().endswith((".jpg", ".jpeg", ".png", ".webp", ".gif"))):
                return url
    if description:
        match = _IMG_SRC_RE.search(description)
        if match:
            return match.group(1).strip()
    return None


def parse_rss_xml(xml_text: str) -> list[RssItem]:
    root = ET.fromstring(xml_text)
    channel = None
    if _local(root.tag).lower() == "rss":
        for child in root:
            if _local(child.tag).lower() == "channel":
                channel = child
                break
    elif _local(root.tag).lower() == "feed":
        # Atom
        items: list[RssItem] = []
        for entry in root:
            if _local(entry.tag).lower() != "entry":
                continue
            title = _child_text(entry, {"title"}) or ""
            link = None
            for child in entry:
                if _local(child.tag).lower() == "link":
                    href = (child.attrib.get("href") or child.text or "").strip()
                    if href:
                        link = href
                        break
            summary_raw = _child_text(entry, {"summary", "content"})
            published = _child_text(entry, {"published", "updated"})
            if not title.strip() or not link:
                continue
            items.append(
                RssItem(
                    title=title.strip()[:255],
                    link=link[:1024],
                    summary=_strip_html(summary_raw),
                    image_url=_extract_image(entry, summary_raw),
                    posted_on=_parse_pubdate(published),
                    guid=_child_text(entry, {"id"}),
                )
            )
        return items
    else:
        channel = root

    if channel is None:
        return []

    items: list[RssItem] = []
    for item in channel:
        if _local(item.tag).lower() != "item":
            continue
        title = _child_text(item, {"title"}) or ""
        link = _child_text(item, {"link"}) or ""
        description = _child_text(item, {"description", "summary"})
        if not title.strip() or not link.strip():
            continue
        if not link.startswith(("http://", "https://")):
            continue
        items.append(
            RssItem(
                title=title.strip()[:255],
                link=link.strip()[:1024],
                summary=_strip_html(description),
                image_url=_extract_image(item, description),
                posted_on=_parse_pubdate(_child_text(item, {"pubdate"})),
                guid=_child_text(item, {"guid"}),
            )
        )
    return items


def fetch_feed_items(client: httpx.Client, url: str, *, limit: int) -> list[RssItem]:
    response = client.get(url, timeout=30.0)
    response.raise_for_status()
    items = parse_rss_xml(response.text)
    items.sort(key=lambda row: row.posted_on, reverse=True)
    return items[: max(1, limit)]


def _unique_slug(db: Session, title: str, link: str) -> str:
    digest = hashlib.sha1(link.encode("utf-8")).hexdigest()[:8]
    base = f"{slugify_title(title)[:220]}-{digest}"
    candidate = base
    suffix = 2
    while db.query(NewsPost).filter(NewsPost.slug == candidate).first() is not None:
        candidate = f"{base}-{suffix}"
        suffix += 1
    return candidate


def _upsert_rss_item(
    db: Session,
    *,
    source_label: str,
    display_name: str,
    item: RssItem,
) -> str:
    existing = (
        db.query(NewsPost)
        .filter(NewsPost.external_url == item.link)
        .first()
    )
    attribution = (
        f"Industry news via {display_name}. "
        f"Read the full article on {display_name}."
    )
    if existing is not None:
        if existing.source_label != source_label:
            # Admin-authored or other source — do not overwrite.
            return "skipped"
        existing.title = item.title
        existing.short_description = item.summary
        existing.long_description = attribution
        existing.cover_url = item.image_url or existing.cover_url
        existing.tag = display_name
        existing.posted_on = item.posted_on
        existing.published = True
        return "updated"

    row = NewsPost(
        title=item.title,
        slug=_unique_slug(db, item.title, item.link),
        short_description=item.summary,
        long_description=attribution,
        external_url=item.link,
        cover_url=item.image_url,
        image_urls=None,
        video_urls=None,
        tag=display_name,
        source_label=source_label,
        posted_on=item.posted_on,
        published=True,
        featured=False,
        sort_order=0,
    )
    db.add(row)
    db.flush()
    return "created"


def sync_news_rss(db: Session, *, client: httpx.Client | None = None) -> NewsRssSyncResult:
    result = NewsRssSyncResult()
    owns_client = client is None
    http = client or httpx.Client(
        headers={"User-Agent": USER_AGENT, "Accept": "application/rss+xml, application/xml, text/xml, */*"},
        follow_redirects=True,
        timeout=30.0,
    )
    limit = max(1, int(settings.news_rss_max_per_feed or 20))
    feeds: list[tuple[str, str]] = [
        (SOURCE_FACILITIES_DIVE, (settings.news_rss_facilities_dive_url or "").strip()),
        (SOURCE_FACILITIESNET, (settings.news_rss_facilitiesnet_url or "").strip()),
    ]
    try:
        for source_label, url in feeds:
            display = RSS_SOURCES[source_label]
            if not url:
                result.errors.append(f"{source_label}: feed URL not configured")
                continue
            try:
                items = fetch_feed_items(http, url, limit=limit)
            except Exception as exc:  # noqa: BLE001 — isolate source failures
                result.errors.append(f"{source_label}: {exc}")
                logger.warning("News RSS sync failed for %s: %s", source_label, exc)
                continue
            if not items:
                result.errors.append(f"{source_label}: no items parsed")
                continue
            result.sources.append(source_label)
            for item in items:
                action = _upsert_rss_item(
                    db,
                    source_label=source_label,
                    display_name=display,
                    item=item,
                )
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

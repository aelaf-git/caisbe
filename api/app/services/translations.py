"""Hand-written translations for public content, with English fallback."""

from __future__ import annotations

from typing import Any, TypeVar

from fastapi import HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.models import (
    ContentTranslation,
    Course,
    IndustryEvent,
    JobPosting,
    MediaAsset,
    NewsPost,
    Seminar,
    SitePage,
    Testimonial,
)
from app.security.html_sanitize import sanitize_html, strip_plain_text

SUPPORTED_LANGS = {"fr"}

# Only these fields may be translated. Ids, slugs, dates, URLs and flags never change.
ALLOWED_FIELDS: dict[str, tuple[str, ...]] = {
    "site_page": ("title", "menu_label", "description", "lead", "sections", "cta_label"),
    "news": ("title", "short_description", "long_description", "tag"),
    "event": ("title", "summary", "location"),
    "job": ("title", "summary", "description", "company", "location"),
    "seminar": ("title", "description"),
    "testimonial": ("quote", "role"),
    "media": ("title", "description", "body", "eyebrow", "headline", "subheadline", "cta_label"),
    "course": ("title", "description"),
}

RICH_FIELDS = {"long_description", "body"}

ENTITY_MODELS = {
    "site_page": SitePage,
    "news": NewsPost,
    "event": IndustryEvent,
    "job": JobPosting,
    "seminar": Seminar,
    "testimonial": Testimonial,
    "media": MediaAsset,
    "course": Course,
}

T = TypeVar("T", bound=BaseModel)


def translation_lang(lang: str | None) -> str | None:
    """Return a supported translation language, or None for the English original."""
    value = (lang or "en").strip().lower()
    if value.startswith("fr"):
        return "fr"
    return None


def require_entity_type(entity_type: str) -> str:
    if entity_type not in ALLOWED_FIELDS:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown content type")
    return entity_type


def _clean_text(name: str, value: Any) -> str:
    if value is None:
        return ""
    text = str(value)
    if name in RICH_FIELDS:
        return (sanitize_html(text) or "")[:20000].strip()
    return (strip_plain_text(text) or "")[:4000].strip()


def _clean_sections(value: Any) -> list[dict[str, Any]]:
    sections: list[dict[str, Any]] = []
    if not isinstance(value, list):
        return sections
    for raw in value:
        if not isinstance(raw, dict):
            continue
        title = (strip_plain_text(str(raw.get("title") or "")) or "")[:200].strip()
        if not title:
            continue
        items = [
            (strip_plain_text(str(item)) or "")[:300].strip()
            for item in (raw.get("items") or [])
            if str(item).strip()
        ]
        sections.append(
            {
                "title": title,
                "body": (strip_plain_text(str(raw.get("body") or "")) or "")[:4000].strip(),
                "items": [item for item in items if item][:30],
            }
        )
    return sections[:20]


def clean_fields(entity_type: str, fields: dict[str, Any]) -> dict[str, Any]:
    allowed = ALLOWED_FIELDS[entity_type]
    cleaned: dict[str, Any] = {}
    for name in allowed:
        if name not in fields:
            continue
        if name == "sections":
            sections = _clean_sections(fields[name])
            if sections:
                cleaned[name] = sections
            continue
        text = _clean_text(name, fields[name])
        if text:
            cleaned[name] = text
    return cleaned


def get_translation(db: Session, entity_type: str, entity_id: int, lang: str) -> dict[str, Any]:
    row = (
        db.query(ContentTranslation)
        .filter(
            ContentTranslation.entity_type == entity_type,
            ContentTranslation.entity_id == entity_id,
            ContentTranslation.lang == lang,
        )
        .first()
    )
    return dict(row.fields or {}) if row else {}


def save_translation(
    db: Session, entity_type: str, entity_id: int, lang: str, fields: dict[str, Any]
) -> dict[str, Any]:
    model = ENTITY_MODELS[entity_type]
    if db.query(model).filter(model.id == entity_id).first() is None:  # type: ignore[attr-defined]
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")
    cleaned = clean_fields(entity_type, fields)
    row = (
        db.query(ContentTranslation)
        .filter(
            ContentTranslation.entity_type == entity_type,
            ContentTranslation.entity_id == entity_id,
            ContentTranslation.lang == lang,
        )
        .first()
    )
    if row is None:
        db.add(ContentTranslation(entity_type=entity_type, entity_id=entity_id, lang=lang, fields=cleaned))
    else:
        row.fields = cleaned
    db.commit()
    return cleaned


def _overlay_map(db: Session, entity_type: str, ids: list[int], lang: str) -> dict[int, dict[str, Any]]:
    if not ids:
        return {}
    rows = (
        db.query(ContentTranslation)
        .filter(
            ContentTranslation.entity_type == entity_type,
            ContentTranslation.lang == lang,
            ContentTranslation.entity_id.in_(ids),
        )
        .all()
    )
    return {row.entity_id: dict(row.fields or {}) for row in rows}


def _apply(entity_type: str, item: T, fields: dict[str, Any]) -> T:
    allowed = set(ALLOWED_FIELDS[entity_type])
    update = {key: value for key, value in fields.items() if key in allowed and value not in (None, "", [])}
    if not update:
        return item
    return type(item).model_validate({**item.model_dump(), **update})


def localize_many(db: Session, entity_type: str, items: list[T], lang: str | None) -> list[T]:
    code = translation_lang(lang)
    if code is None or not items:
        return items
    ids = [getattr(item, "id") for item in items]
    overlay = _overlay_map(db, entity_type, ids, code)
    return [_apply(entity_type, item, overlay.get(getattr(item, "id"), {})) for item in items]


def localize_one(db: Session, entity_type: str, item: T, lang: str | None) -> T:
    return localize_many(db, entity_type, [item], lang)[0]

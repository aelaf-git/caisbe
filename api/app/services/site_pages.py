"""Public landing pages: paths, menu, and the home text block."""

from __future__ import annotations

import json
import re

from fastapi import HTTPException, status
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.models import AppSetting, SitePage
from app.schemas.site_pages import (
    DEFAULT_HOME_FR,
    HomeCard,
    HomeLandingIn,
    HomeLandingOut,
    HomeOffice,
    SiteNavItem,
    SitePageIn,
    SitePageOut,
    SiteSection,
)
from app.security.html_sanitize import strip_plain_text

SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
HOME_KEY = "home_landing"
HOME_KEY_FR = "home_landing_fr"

DEFAULT_HOME = HomeLandingIn()


def normalize_home_lang(lang: str | None) -> str:
    value = (lang or "en").strip().lower()
    if value in {"fr", "fr-ca", "fr-fr"} or value.startswith("fr"):
        return "fr"
    return "en"


def _home_storage(lang: str | None) -> tuple[str, HomeLandingIn]:
    if normalize_home_lang(lang) == "fr":
        return HOME_KEY_FR, DEFAULT_HOME_FR
    return HOME_KEY, DEFAULT_HOME



def _clean(value: str | None, *, limit: int) -> str:
    text = strip_plain_text(value) or ""
    return text[:limit].strip()


def _slug(value: str) -> str:
    slug = _clean(value, limit=80).lower()
    if not SLUG_RE.match(slug):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Use a slug of lowercase letters, numbers, and hyphens.",
        )
    return slug


def _href(value: str | None) -> str | None:
    text = _clean(value, limit=500)
    if not text:
        return None
    if text.startswith(("/", "mailto:", "https://", "http://")):
        return text
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Button link must start with /, mailto:, http://, or https://.",
    )


def _sections(sections: list[SiteSection]) -> list[dict]:
    cleaned: list[dict] = []
    for section in sections:
        title = _clean(section.title, limit=200)
        if not title:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Each section needs a heading.")
        items = []
        for item in section.items:
            text = _clean(item, limit=300)
            if text:
                items.append(text)
        cleaned.append({"title": title, "body": _clean(section.body, limit=4000), "items": items[:30]})
    return cleaned


def _status(value: str) -> str:
    status_value = (value or "").strip().lower()
    if status_value not in {"draft", "published"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Status must be draft or published.")
    return status_value


def normalize_public_path(raw: str) -> str:
    value = (raw or "").strip()
    if not value.startswith("/"):
        value = f"/{value}"
    if value != "/" and value.endswith("/"):
        value = value[:-1]
    if not value.startswith("/") or "//" in value or ".." in value or "\\" in value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid page path.")
    return value


def _pages(db: Session) -> list[SitePage]:
    return db.query(SitePage).order_by(SitePage.sort_order.asc(), SitePage.id.asc()).all()


def _descendant_ids(page_id: int, pages: list[SitePage]) -> set[int]:
    found: set[int] = set()
    pending = [page_id]
    while pending:
        current = pending.pop()
        for page in pages:
            if page.parent_id == current and page.id not in found:
                found.add(page.id)
                pending.append(page.id)
    return found


def _assign_paths(pages: list[SitePage]) -> None:
    by_id = {page.id: page for page in pages}

    def depth(page: SitePage, seen: set[int]) -> int:
        if page.parent_id is None or page.id in seen:
            return 0
        parent = by_id.get(page.parent_id)
        if parent is None:
            return 0
        return 1 + depth(parent, seen | {page.id})

    for page in sorted(pages, key=lambda row: depth(row, set())):
        parent = by_id.get(page.parent_id) if page.parent_id else None
        page.path = f"{parent.path.rstrip('/')}/{page.slug}" if parent else f"/{page.slug}"


def _ensure_unique_paths(pages: list[SitePage]) -> None:
    seen: set[str] = set()
    for page in pages:
        if page.path in seen:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="That address is already used by another page.",
            )
        seen.add(page.path)


def page_out(page: SitePage) -> SitePageOut:
    sections = []
    for section in page.sections or []:
        if isinstance(section, dict) and section.get("title"):
            sections.append(
                SiteSection(
                    title=str(section.get("title") or ""),
                    body=str(section.get("body") or ""),
                    items=[str(item) for item in (section.get("items") or []) if str(item).strip()],
                )
            )
    return SitePageOut(
        id=page.id,
        parent_id=page.parent_id,
        title=page.title,
        menu_label=page.menu_label,
        slug=page.slug,
        path=page.path,
        description=page.description or "",
        lead=page.lead or "",
        sections=sections,
        cta_label=page.cta_label,
        cta_href=page.cta_href,
        sort_order=page.sort_order,
        show_in_menu=page.show_in_menu,
        status=page.status,
    )


def list_pages(db: Session) -> list[SitePageOut]:
    pages = _pages(db)
    return [page_out(page) for page in sorted(pages, key=lambda row: row.path)]


def nav_items(db: Session) -> list[SiteNavItem]:
    pages = _pages(db)
    by_id = {page.id: page for page in pages}
    items: list[SiteNavItem] = []
    for page in pages:
        if page.status != "published" or not page.show_in_menu:
            continue
        parent = by_id.get(page.parent_id) if page.parent_id else None
        items.append(
            SiteNavItem(
                id=page.id,
                menu_label=page.menu_label,
                path=page.path,
                parent_path=parent.path if parent else None,
                sort_order=page.sort_order,
            )
        )
    return items


def published_page(db: Session, raw_path: str) -> SitePageOut:
    path = normalize_public_path(raw_path)
    page = db.query(SitePage).filter(SitePage.path == path, SitePage.status == "published").first()
    if page is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")
    return page_out(page)


def _apply(page: SitePage, payload: SitePageIn, pages: list[SitePage]) -> None:
    slug = _slug(payload.slug)
    title = _clean(payload.title, limit=255)
    if not title:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Title is required.")
    menu = _clean(payload.menu_label, limit=120) or title[:120]
    parent_id = payload.parent_id
    if parent_id is not None:
        if page.id and parent_id == page.id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A page cannot be its own parent.")
        if parent_id not in {row.id for row in pages}:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Parent page was not found.")
        if page.id and parent_id in _descendant_ids(page.id, pages):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Choose a parent that is not a subpage of this page.")
    siblings = [row for row in pages if row.parent_id == parent_id and row.id != page.id]
    if any(row.slug == slug for row in siblings):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A page with that slug already exists here.")

    page.title = title
    page.menu_label = menu
    page.slug = slug
    page.parent_id = parent_id
    page.description = _clean(payload.description, limit=2000)
    page.lead = _clean(payload.lead, limit=4000)
    page.sections = _sections(payload.sections)
    page.cta_label = _clean(payload.cta_label, limit=120) or None
    page.cta_href = _href(payload.cta_href)
    page.sort_order = payload.sort_order
    page.show_in_menu = payload.show_in_menu
    page.status = _status(payload.status)
    if not page.path:
        page.path = f"/pending-{slug}"


def save_page(db: Session, payload: SitePageIn, page: SitePage | None = None) -> SitePage:
    pages = _pages(db)
    if page is None:
        page = SitePage(title="Page", menu_label="Page", slug="page", path="/pending", sections=[])
        db.add(page)
        db.flush()
        page.path = f"/pending-{page.id}"
        pages.append(page)
    _apply(page, payload, pages)
    _assign_paths(pages)
    _ensure_unique_paths(pages)
    db.commit()
    db.refresh(page)
    return page


def delete_page(db: Session, page: SitePage) -> None:
    child = db.query(SitePage).filter(SitePage.parent_id == page.id).first()
    if child is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Move or delete the subpages before deleting this page.",
        )
    db.delete(page)
    db.commit()


def _cards(items: list[HomeCard]) -> list[dict]:
    cleaned = []
    for item in items:
        title = _clean(item.title, limit=200)
        description = _clean(item.description, limit=4000)
        if title or description:
            if not title or not description:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Each card needs a title and a description.",
                )
            cleaned.append({"title": title, "description": description})
    return cleaned


def _offices(items: list[HomeOffice]) -> list[dict]:
    cleaned = []
    for item in items:
        region = _clean(item.region, limit=80)
        address = _clean(item.address, limit=400)
        map_query = _clean(item.map_query, limit=300) or address.replace("\n", " ")
        if region or address:
            if not region or not address:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Each office needs a region and an address.",
                )
            cleaned.append({"region": region, "address": address, "map_query": map_query})
    return cleaned


def _landing_from(payload: HomeLandingIn) -> HomeLandingOut:
    cleaned = payload
    text_fields = {
        "tagline": 200,
        "hero_intro": 2000,
        "hero_button": 80,
        "about_eyebrow": 120,
        "about_body": 4000,
        "about_cta": 80,
        "certificates_title": 160,
        "certificates_subtitle": 240,
        "certificates_cta": 80,
        "seminars_title": 160,
        "seminars_body_1": 500,
        "seminars_body_2": 500,
        "seminars_cta": 80,
        "magazine_title": 160,
        "magazine_subtitle": 300,
        "magazine_cta": 80,
        "practice_eyebrow": 80,
        "practice_title": 200,
        "practice_body": 500,
        "offices_title": 80,
        "testimonials_eyebrow": 80,
        "testimonials_title": 200,
        "contact_eyebrow": 80,
        "contact_title": 120,
        "contact_lead": 500,
        "contact_address": 400,
        "contact_phone": 120,
        "contact_email": 160,
        "contact_hours": 160,
        "contact_form_heading": 120,
        "contact_cta": 80,
    }
    stored = cleaned.model_dump()
    for key, limit in text_fields.items():
        stored[key] = _clean(stored[key], limit=limit)
    stored["stats"] = [
        {"value": _clean(item["value"], limit=40), "label": _clean(item["label"], limit=160)}
        for item in stored["stats"]
    ]
    stored["about_highlights"] = _cards([HomeCard.model_validate(item) for item in stored["about_highlights"]])
    stored["practice_items"] = _cards([HomeCard.model_validate(item) for item in stored["practice_items"]])
    stored["offices"] = _offices([HomeOffice.model_validate(item) for item in stored["offices"]])
    if not stored["tagline"] or not stored["hero_intro"] or any(
        not item["value"] or not item["label"] for item in stored["stats"]
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Fill in the tagline, intro, and each statistic.",
        )
    return HomeLandingOut.model_validate(stored)


def read_home(db: Session, lang: str = "en") -> HomeLandingOut | None:
    key, default_model = _home_storage(lang)
    row = db.query(AppSetting).filter(AppSetting.key == key).first()
    if row is None or not (row.value or "").strip():
        return None
    try:
        data = json.loads(row.value)
    except json.JSONDecodeError:
        return None
    if not isinstance(data, dict):
        return None
    merged = {**default_model.model_dump(), **data}
    try:
        return HomeLandingOut.model_validate(merged)
    except ValidationError:
        return HomeLandingOut.model_validate(default_model.model_dump())


def write_home(db: Session, payload: HomeLandingIn, lang: str = "en") -> HomeLandingOut:
    key, _ = _home_storage(lang)
    stored = _landing_from(payload)
    row = db.query(AppSetting).filter(AppSetting.key == key).first()
    encoded = json.dumps(stored.model_dump())
    if row is None:
        db.add(AppSetting(key=key, value=encoded))
    else:
        row.value = encoded
    db.commit()
    return stored


def home_for_admin(db: Session, lang: str = "en") -> HomeLandingOut:
    _, default_model = _home_storage(lang)
    return read_home(db, lang=lang) or HomeLandingOut.model_validate(default_model.model_dump())

"""Ensure default homepage hero slides exist once as MediaAssets."""

from sqlalchemy.orm import Session

from app.models import AppSetting, MediaAsset
from app.services.settings import ensure_default_settings

HERO_DEFAULTS_SEEDED_KEY = "hero_defaults_seeded"
HERO_PANEL_COPY_BACKFILL_KEY = "hero_panel_copy_backfilled_v1"

ORG_SUBHEADLINE = "Canada Africa Institute for the Sustainable Built Environment"

DEFAULT_HERO_ASSETS: list[dict[str, str | int | bool]] = [
    {
        "title": "CAISBE campus and learning community",
        "file_url": "/images/hero_1.jpeg",
        "sort_order": 0,
        "show_text_panel": True,
        "eyebrow": "Membership",
        "headline": "CAISBE",
        "subheadline": ORG_SUBHEADLINE,
        "description": (
            "Join a community of facility and property management professionals "
            "building sustainable places across Canada and Africa."
        ),
        "cta_label": "Join CAISBE",
        "cta_url": None,
    },
    {
        "title": "CAISBE students and professionals",
        "file_url": "/images/hero_2.jpeg",
        "sort_order": 1,
        "show_text_panel": True,
        "eyebrow": "Professional development",
        "headline": "Build your FM career",
        "subheadline": ORG_SUBHEADLINE,
        "description": (
            "Certificate programs and learning formats that connect Canadian expertise "
            "with African industry needs."
        ),
        "cta_label": "View programs",
        "cta_url": "/professional-development",
    },
    {
        "title": "CAISBE built environment education",
        "file_url": "/images/hero_3.jpeg",
        "sort_order": 2,
        "show_text_panel": True,
        "eyebrow": "Community",
        "headline": "Transforming buildings",
        "subheadline": ORG_SUBHEADLINE,
        "description": (
            "Education, standards, and membership that empower sustainable transformation "
            "across buildings and infrastructure."
        ),
        "cta_label": "Learn more",
        "cta_url": "/about",
    },
]

_GENERIC_PANEL = {
    "eyebrow": "Membership",
    "headline": "CAISBE",
    "subheadline": ORG_SUBHEADLINE,
    "description": (
        "CAISBE prepares the next generation of facility and property management "
        "professionals to lead the sustainable transformation of buildings and "
        "infrastructure across Africa."
    ),
    "cta_label": "Join CAISBE",
    "cta_url": None,
}


def _seed_flag(db: Session) -> AppSetting | None:
    return db.query(AppSetting).filter(AppSetting.key == HERO_DEFAULTS_SEEDED_KEY).first()


def _backfill_flag(db: Session) -> AppSetting | None:
    return db.query(AppSetting).filter(AppSetting.key == HERO_PANEL_COPY_BACKFILL_KEY).first()


def _panel_fields_empty(asset: MediaAsset) -> bool:
    return not any(
        [
            (asset.eyebrow or "").strip(),
            (asset.headline or "").strip(),
            (asset.subheadline or "").strip(),
            (asset.description or "").strip(),
            (asset.cta_label or "").strip(),
            (asset.cta_url or "").strip(),
        ]
    )


def _apply_panel_defaults(asset: MediaAsset, defaults: dict[str, str | int | bool]) -> None:
    """Fill only empty panel fields so admin edits are never overwritten."""
    if asset.eyebrow is None or not str(asset.eyebrow).strip():
        asset.eyebrow = str(defaults["eyebrow"]) if defaults.get("eyebrow") else None
    if asset.headline is None or not str(asset.headline).strip():
        asset.headline = str(defaults["headline"]) if defaults.get("headline") else None
    if asset.subheadline is None or not str(asset.subheadline).strip():
        asset.subheadline = str(defaults["subheadline"]) if defaults.get("subheadline") else None
    if asset.description is None or not str(asset.description).strip():
        asset.description = str(defaults["description"]) if defaults.get("description") else None
    if asset.cta_label is None or not str(asset.cta_label).strip():
        asset.cta_label = str(defaults["cta_label"]) if defaults.get("cta_label") else None
    if asset.cta_url is None or not str(asset.cta_url).strip():
        raw = defaults.get("cta_url")
        asset.cta_url = str(raw) if raw else None


def backfill_hero_panel_copy(db: Session) -> None:
    """One-time fill of empty panel copy on existing hero slides (post migration)."""
    flag = _backfill_flag(db)
    if flag is not None and flag.value == "1":
        return

    by_url = {str(item["file_url"]): item for item in DEFAULT_HERO_ASSETS}
    rows = db.query(MediaAsset).filter(MediaAsset.category == "hero").all()
    for row in rows:
        defaults = by_url.get((row.file_url or "").strip())
        if defaults is not None:
            _apply_panel_defaults(row, defaults)
            continue
        if _panel_fields_empty(row) and row.show_text_panel is not False:
            _apply_panel_defaults(row, _GENERIC_PANEL)

    if flag is None:
        db.add(AppSetting(key=HERO_PANEL_COPY_BACKFILL_KEY, value="1"))
    else:
        flag.value = "1"
    db.flush()


def ensure_default_hero_slides(db: Session) -> None:
    """Insert the three homepage default images once; never re-seed after delete."""
    ensure_default_settings(db)
    flag = _seed_flag(db)
    if flag is None or flag.value != "1":
        existing = db.query(MediaAsset).filter(MediaAsset.category == "hero").count()
        if existing == 0:
            for item in DEFAULT_HERO_ASSETS:
                db.add(
                    MediaAsset(
                        title=str(item["title"]),
                        description=str(item["description"]) if item.get("description") else None,
                        file_url=str(item["file_url"]),
                        cover_url=None,
                        category="hero",
                        published=True,
                        featured=False,
                        sort_order=int(item["sort_order"]),
                        show_text_panel=bool(item.get("show_text_panel", True)),
                        eyebrow=str(item["eyebrow"]) if item.get("eyebrow") else None,
                        headline=str(item["headline"]) if item.get("headline") else None,
                        subheadline=str(item["subheadline"]) if item.get("subheadline") else None,
                        cta_label=str(item["cta_label"]) if item.get("cta_label") else None,
                        cta_url=str(item["cta_url"]) if item.get("cta_url") else None,
                    )
                )

        if flag is None:
            db.add(AppSetting(key=HERO_DEFAULTS_SEEDED_KEY, value="1"))
        else:
            flag.value = "1"
        db.flush()

    backfill_hero_panel_copy(db)

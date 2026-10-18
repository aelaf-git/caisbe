"""Ensure default homepage hero slides exist once as MediaAssets."""

from sqlalchemy.orm import Session

from app.models import AppSetting, MediaAsset
from app.services.settings import ensure_default_settings

HERO_DEFAULTS_SEEDED_KEY = "hero_defaults_seeded"

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


def _seed_flag(db: Session) -> AppSetting | None:
    return db.query(AppSetting).filter(AppSetting.key == HERO_DEFAULTS_SEEDED_KEY).first()


def ensure_default_hero_slides(db: Session) -> None:
    """Insert the three homepage default images once; never re-seed after delete."""
    ensure_default_settings(db)
    flag = _seed_flag(db)
    if flag is not None and flag.value == "1":
        return

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

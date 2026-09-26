"""Ensure default homepage hero slides exist once as MediaAssets."""

from sqlalchemy.orm import Session

from app.models import AppSetting, MediaAsset
from app.services.settings import ensure_default_settings

HERO_DEFAULTS_SEEDED_KEY = "hero_defaults_seeded"

DEFAULT_HERO_ASSETS: list[dict[str, str | int]] = [
    {
        "title": "CAISBE campus and learning community",
        "file_url": "/images/hero_1.jpeg",
        "sort_order": 0,
    },
    {
        "title": "CAISBE students and professionals",
        "file_url": "/images/hero_2.jpeg",
        "sort_order": 1,
    },
    {
        "title": "CAISBE built environment education",
        "file_url": "/images/hero_3.jpeg",
        "sort_order": 2,
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
                    description=None,
                    file_url=str(item["file_url"]),
                    cover_url=None,
                    category="hero",
                    published=True,
                    featured=False,
                    sort_order=int(item["sort_order"]),
                )
            )

    if flag is None:
        db.add(AppSetting(key=HERO_DEFAULTS_SEEDED_KEY, value="1"))
    else:
        flag.value = "1"
    db.flush()

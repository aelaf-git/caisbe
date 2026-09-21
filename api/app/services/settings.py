"""App settings key-value helpers."""

from sqlalchemy.orm import Session

from app.models import AppSetting

DEFAULT_SETTINGS: dict[str, str] = {
    "institute_name": "CAISBE",
    "default_pass_percent": "70",
    "membership_cert_title": "Certificate of Membership",
    "completion_cert_title": "Certificate of Completion",
}


def ensure_default_settings(db: Session) -> None:
    for key, value in DEFAULT_SETTINGS.items():
        row = db.query(AppSetting).filter(AppSetting.key == key).first()
        if row is None:
            db.add(AppSetting(key=key, value=value))
    db.flush()


def get_settings_map(db: Session) -> dict[str, str]:
    ensure_default_settings(db)
    rows = db.query(AppSetting).all()
    data = dict(DEFAULT_SETTINGS)
    for row in rows:
        data[row.key] = row.value
    return data


def get_setting(db: Session, key: str) -> str:
    return get_settings_map(db).get(key, DEFAULT_SETTINGS.get(key, ""))


def set_settings(db: Session, updates: dict[str, str]) -> dict[str, str]:
    ensure_default_settings(db)
    for key, value in updates.items():
        if key not in DEFAULT_SETTINGS:
            continue
        row = db.query(AppSetting).filter(AppSetting.key == key).first()
        if row is None:
            db.add(AppSetting(key=key, value=value))
        else:
            row.value = value
    db.flush()
    return get_settings_map(db)


def default_pass_percent(db: Session) -> int:
    raw = get_setting(db, "default_pass_percent")
    try:
        value = int(raw)
    except (TypeError, ValueError):
        return 70
    return max(0, min(100, value))

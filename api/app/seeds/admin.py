import logging
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.security.auth import hash_password
from app.config import DEFAULT_ADMIN_PASSWORD, settings
from app.models import User

logger = logging.getLogger(__name__)


def seed_admin(db: Session) -> None:
    email = settings.admin_email.lower().strip()
    existing = db.query(User).filter(User.email == email).first()
    if existing is None:
        if settings.is_production and settings.admin_password == DEFAULT_ADMIN_PASSWORD:
            logger.warning(
                "ADMIN_PASSWORD is still the built-in default, so no admin account was created. "
                "Set ADMIN_PASSWORD on the API service, then redeploy."
            )
            return
        db.add(
            User(
                full_name=settings.admin_full_name,
                email=email,
                hashed_password=hash_password(settings.admin_password),
                role="admin",
                email_verified_at=datetime.now(timezone.utc),
            )
        )
        db.commit()
        return

    changed = False
    if existing.role != "admin":
        existing.role = "admin"
        changed = True
    if existing.email_verified_at is None:
        existing.email_verified_at = datetime.now(timezone.utc)
        changed = True
    if changed:
        db.commit()

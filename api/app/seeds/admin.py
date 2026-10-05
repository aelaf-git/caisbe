from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.security.auth import hash_password
from app.config import settings
from app.models import User


def seed_admin(db: Session) -> None:
    email = settings.admin_email.lower().strip()
    existing = db.query(User).filter(User.email == email).first()
    if existing is None:
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

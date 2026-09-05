from sqlalchemy.orm import Session

from app.auth import hash_password
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
            )
        )
        db.commit()
        return

    if existing.role != "admin":
        existing.role = "admin"
        db.commit()

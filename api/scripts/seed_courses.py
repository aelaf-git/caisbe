"""Seed three CAISBE demo courses."""

from app.db import SessionLocal
from app.seed_courses import seed_courses


def main() -> None:
    db = SessionLocal()
    try:
        created = seed_courses(db)
        if not created:
            print("All seed courses already exist.")
            return
        print(f"Created courses: {', '.join(created)}")
    finally:
        db.close()


if __name__ == "__main__":
    main()

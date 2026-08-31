"""Copy SQLite data into the configured Postgres database, preserving IDs."""

from __future__ import annotations

import sqlite3
from pathlib import Path

from sqlalchemy import create_engine, text

from app.config import settings

ROOT = Path(__file__).resolve().parents[1]
SQLITE_PATH = ROOT / "caisbe.db"

TABLES = [
    "users",
    "courses",
    "quizzes",
    "chapters",
    "lessons",
    "final_exams",
    "certificate_templates",
    "quiz_questions",
    "quiz_choices",
    "content_blocks",
    "enrollments",
    "lesson_progress",
    "quiz_attempts",
    "certificates",
]


def copy() -> None:
    if not SQLITE_PATH.exists():
        print(f"No SQLite database at {SQLITE_PATH}; skipping copy.")
        return
    if settings.database_url.startswith("sqlite"):
        raise SystemExit("DATABASE_URL still points at SQLite. Point it at Postgres first.")

    sqlite = sqlite3.connect(SQLITE_PATH)
    sqlite.row_factory = sqlite3.Row
    pg = create_engine(settings.database_url)

    with pg.begin() as conn:
        existing = conn.execute(
            text("SELECT tablename FROM pg_tables WHERE schemaname = 'public'")
        ).fetchall()
        tables = {row[0] for row in existing}
        missing = [name for name in TABLES if name not in tables]
        if missing:
            raise SystemExit(
                f"Postgres is missing tables {missing}. Run `alembic upgrade head` from api/."
            )

        conn.execute(text("SET session_replication_role = replica"))
        quoted = ", ".join(f'"{name}"' for name in TABLES)
        conn.execute(text(f"TRUNCATE TABLE {quoted} RESTART IDENTITY CASCADE"))

        for table in TABLES:
            rows = sqlite.execute(f'SELECT * FROM "{table}"').fetchall()
            if not rows:
                print(f"{table}: 0 rows")
                continue
            columns = list(rows[0].keys())
            col_sql = ", ".join(f'"{c}"' for c in columns)
            placeholders = ", ".join(f":{c}" for c in columns)
            insert = text(f'INSERT INTO "{table}" ({col_sql}) VALUES ({placeholders})')
            payload = [dict(row) for row in rows]
            if table == "content_blocks":
                payload.sort(key=lambda row: (row.get("parent_id") is not None, row.get("id") or 0))
            conn.execute(insert, payload)
            print(f"{table}: {len(payload)} rows")

        for table in TABLES:
            seq = conn.execute(
                text("SELECT pg_get_serial_sequence(:table_name, 'id')"),
                {"table_name": table},
            ).scalar()
            if not seq:
                continue
            conn.execute(
                text(
                    "SELECT setval(:seq, (SELECT COALESCE(MAX(id), 1) FROM "
                    f'"{table}"), true)'
                ),
                {"seq": seq},
            )
        conn.execute(text("SET session_replication_role = DEFAULT"))

    sqlite.close()
    print(f"Copied {SQLITE_PATH} -> {settings.database_url}")


if __name__ == "__main__":
    copy()

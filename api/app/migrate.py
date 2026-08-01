from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


def ensure_sqlite_columns(engine: Engine) -> None:
    """Add columns introduced after the initial portal schema (SQLite has no ALTER evolve)."""
    if engine.dialect.name != "sqlite":
        return

    inspector = inspect(engine)
    tables = set(inspector.get_table_names())

    with engine.begin() as conn:
        if "users" in tables:
            user_cols = {c["name"] for c in inspector.get_columns("users")}
            if "role" not in user_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR(32) DEFAULT 'student'"))
            if "phone" not in user_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN phone VARCHAR(40)"))
            if "country" not in user_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN country VARCHAR(100)"))
            if "city" not in user_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN city VARCHAR(100)"))

        if "courses" in tables:
            course_cols = {c["name"] for c in inspector.get_columns("courses")}
            if "status" not in course_cols:
                conn.execute(text("ALTER TABLE courses ADD COLUMN status VARCHAR(32) DEFAULT 'draft'"))
            if "cover_url" not in course_cols:
                conn.execute(text("ALTER TABLE courses ADD COLUMN cover_url VARCHAR(512)"))
            if "pass_percent" not in course_cols:
                conn.execute(text("ALTER TABLE courses ADD COLUMN pass_percent INTEGER DEFAULT 70"))
            # Retire legacy seed catalog from student portal until explicitly published.
            conn.execute(text("UPDATE courses SET status = 'draft' WHERE status IS NULL OR status = ''"))

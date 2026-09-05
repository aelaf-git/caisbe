"""Run Alembic migrations programmatically on API startup."""

from __future__ import annotations

from pathlib import Path

from alembic import command
from alembic.config import Config
from alembic.runtime.migration import MigrationContext
from sqlalchemy import create_engine, inspect

from app.config import settings


def _alembic_config() -> Config:
    api_root = Path(__file__).resolve().parent.parent
    config = Config(str(api_root / "alembic.ini"))
    config.set_main_option("script_location", str(api_root / "alembic"))
    config.set_main_option("prepend_sys_path", str(api_root))
    return config


def upgrade_to_head() -> None:
    """Apply pending migrations, or stamp head when legacy create_all schema exists."""
    config = _alembic_config()
    engine = create_engine(settings.database_url, pool_pre_ping=True)

    with engine.connect() as connection:
        current = MigrationContext.configure(connection).get_current_revision()
        if current is None and inspect(connection).has_table("users"):
            # Database was created before Alembic (create_all). Mark baseline applied.
            command.stamp(config, "head")
            return

    command.upgrade(config, "head")

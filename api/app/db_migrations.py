"""Run Alembic migrations programmatically on API startup."""

from __future__ import annotations

from pathlib import Path

from alembic import command
from alembic.config import Config


def upgrade_to_head() -> None:
    api_root = Path(__file__).resolve().parent.parent
    config = Config(str(api_root / "alembic.ini"))
    config.set_main_option("script_location", str(api_root / "alembic"))
    config.set_main_option("prepend_sys_path", str(api_root))
    command.upgrade(config, "head")

"""Pytest fixtures: in-memory SQLite + FastAPI TestClient."""

from __future__ import annotations

import os
from collections.abc import Generator
from unittest.mock import patch

# Must be set before app modules read Settings / create the engine.
os.environ["DATABASE_URL"] = "sqlite+pysqlite:///:memory:"
os.environ["APP_ENV"] = "development"
os.environ["JWT_SECRET"] = "test-secret-key-for-pytest-only-not-for-prod"
os.environ["RESEND_API_KEY"] = ""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import Base, get_db
from app.main import app
from app.security.limiter import limiter

# Shared in-memory DB across connections (needed for StaticPool + TestClient).
engine = create_engine(
    "sqlite+pysqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@event.listens_for(engine, "connect")
def _fk_pragma(dbapi_connection, _connection_record) -> None:
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


@pytest.fixture(autouse=True)
def _disable_rate_limiter() -> Generator[None, None, None]:
    previous = getattr(limiter, "enabled", True)
    limiter.enabled = False
    yield
    limiter.enabled = previous


def _drop_tables() -> None:
    # site_pages references itself. SQLite rejects DROP TABLE while those
    # foreign keys are enabled and rows still exist.
    with engine.begin() as connection:
        connection.exec_driver_sql("PRAGMA foreign_keys=OFF")
        Base.metadata.drop_all(bind=connection)
        connection.exec_driver_sql("PRAGMA foreign_keys=ON")


@pytest.fixture()
def db() -> Generator[Session, None, None]:
    import app.models  # noqa: F401 — register metadata

    _drop_tables()
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        _drop_tables()


@pytest.fixture()
def client(db: Session) -> Generator[TestClient, None, None]:
    def override_get_db() -> Generator[Session, None, None]:
        yield db

    app.dependency_overrides[get_db] = override_get_db
    with (
        patch("app.main.upgrade_to_head"),
        patch("app.main.seed_admin"),
        patch("app.main.seed_industry_events"),
        patch("app.main.seed_forum"),
        patch("app.main.seed_site_pages"),
        patch("app.main._run_job_sync"),
        patch("app.config.settings.job_sync_enabled", False),
    ):
        with TestClient(app) as test_client:
            yield test_client
    app.dependency_overrides.clear()

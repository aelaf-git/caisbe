"""Automatic job board sync and public listing."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import JobPosting, User
from app.security.auth import hash_password
from app.services.job_sync import (
    SOURCE_CURATED,
    JobDraft,
    fetch_curated_drafts,
    sync_jobs,
    upsert_job_draft,
)

STRONG_PASSWORD = "Str0ng-Password!99"


def _admin(db: Session) -> User:
    admin = User(
        full_name="Jobs Admin",
        email="jobs-admin@example.com",
        phone="+15555550123",
        country="Canada",
        city="Toronto",
        hashed_password=hash_password(STRONG_PASSWORD),
        role="admin",
        membership_status="active",
        email_verified_at=datetime.now(timezone.utc),
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin


def _login(client: TestClient, email: str) -> str:
    response = client.post("/api/auth/login", json={"email": email, "password": STRONG_PASSWORD})
    assert response.status_code == 200
    return response.json()["access_token"]


def test_curated_feed_loads_fm_jobs() -> None:
    drafts = fetch_curated_drafts()
    assert len(drafts) >= 3
    assert all(d.source_label == SOURCE_CURATED for d in drafts)
    assert all(d.external_id and d.title and d.apply_url for d in drafts)


def test_upsert_job_draft_is_idempotent(db: Session) -> None:
    now = datetime.now(timezone.utc)
    draft = JobDraft(
        source_label=SOURCE_CURATED,
        external_id="test-job-1",
        title="Facilities Manager",
        company="Acme FM",
        location="Toronto",
        employment_type="full-time",
        summary="Lead facilities operations.",
        description="Full description",
        apply_url="https://example.com/jobs/1",
        posted_on=now,
        expires_on=now + timedelta(days=30),
    )
    assert upsert_job_draft(db, draft) == "created"
    db.commit()
    assert upsert_job_draft(db, draft) == "skipped"
    draft.title = "Senior Facilities Manager"
    assert upsert_job_draft(db, draft) == "updated"
    db.commit()
    row = db.query(JobPosting).filter(JobPosting.external_id == "test-job-1").one()
    assert row.title == "Senior Facilities Manager"


def test_sync_jobs_creates_curated_listings(db: Session) -> None:
    client = MagicMock()
    result = sync_jobs(db, client=client)
    assert result.created >= 3
    assert "curated" in (result.sources or [])
    assert db.query(JobPosting).filter(JobPosting.source_label == SOURCE_CURATED).count() >= 3

    # Second sync should mostly skip
    again = sync_jobs(db, client=client)
    assert again.created == 0
    assert again.skipped >= 3


def test_admin_sync_endpoint_and_public_list(client: TestClient, db: Session) -> None:
    admin = _admin(db)
    token = _login(client, admin.email)
    response = client.post(
        "/api/admin/jobs/sync",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["created"] >= 3
    assert "new" in body["message"].lower()

    public = client.get("/api/jobs")
    assert public.status_code == 200
    jobs = public.json()
    assert len(jobs) >= 3
    assert all(job.get("title") for job in jobs)
    assert all(not job.get("is_expired", False) for job in jobs)

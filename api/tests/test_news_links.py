"""News posts can share an external article URL."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import NewsPost, User
from app.security.auth import hash_password

STRONG_PASSWORD = "Str0ng-Password!99"


def _admin(db: Session) -> User:
    user = User(
        full_name="News Admin",
        email="news-links-admin@example.com",
        phone="+15555550122",
        country="Canada",
        city="Toronto",
        hashed_password=hash_password(STRONG_PASSWORD),
        role="admin",
        membership_status="active",
        email_verified_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _login(client: TestClient, email: str) -> dict[str, str]:
    response = client.post("/api/auth/login", json={"email": email, "password": STRONG_PASSWORD})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_create_and_list_shared_news_link(client: TestClient, db: Session) -> None:
    admin = _admin(db)
    headers = _login(client, admin.email)

    created = client.post(
        "/api/admin/news",
        headers=headers,
        json={
            "title": "External FM article",
            "short_description": "A useful industry write-up.",
            "external_url": "https://example.com/fm-article",
            "posted_on": "2026-10-12T12:00:00.000Z",
            "published": True,
            "featured": False,
        },
    )
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["external_url"] == "https://example.com/fm-article"
    assert body["slug"]

    row = db.query(NewsPost).filter(NewsPost.id == body["id"]).one()
    assert row.external_url == "https://example.com/fm-article"

    public = client.get("/api/news")
    assert public.status_code == 200, public.text
    match = next(item for item in public.json() if item["id"] == body["id"])
    assert match["external_url"] == "https://example.com/fm-article"

    invalid = client.post(
        "/api/admin/news",
        headers=headers,
        json={
            "title": "Bad link",
            "external_url": "not-a-url",
            "posted_on": "2026-10-12T12:00:00.000Z",
            "published": False,
        },
    )
    assert invalid.status_code == 422

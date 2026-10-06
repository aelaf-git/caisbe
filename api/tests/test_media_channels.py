"""YouTube, podcast, and blog MediaAsset channels."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import MediaAsset, User
from app.security.auth import hash_password
from app.services.media_channels import extract_youtube_id, youtube_thumbnail_url

STRONG_PASSWORD = "Str0ng-Password!99"


def _admin(db: Session) -> User:
    admin = User(
        full_name="Media Admin",
        email="media-admin@example.com",
        phone="+15555550999",
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
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def test_extract_youtube_id() -> None:
    assert extract_youtube_id("https://www.youtube.com/watch?v=dQw4w9WgXcQ") == "dQw4w9WgXcQ"
    assert extract_youtube_id("https://youtu.be/dQw4w9WgXcQ") == "dQw4w9WgXcQ"
    assert extract_youtube_id("https://www.youtube.com/embed/dQw4w9WgXcQ") == "dQw4w9WgXcQ"
    assert extract_youtube_id("https://example.com/watch?v=dQw4w9WgXcQ") is None


def test_admin_creates_youtube_with_auto_thumbnail(client: TestClient, db: Session) -> None:
    admin = _admin(db)
    token = _login(client, admin.email)

    created = client.post(
        "/api/admin/media",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "CAISBE Expo Highlight",
            "description": "Forum recap",
            "category": "youtube",
            "external_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "published": True,
        },
    )
    assert created.status_code == 201, created.text
    payload = created.json()
    assert payload["category"] == "youtube"
    assert payload["file_url"] is None
    assert payload["external_url"].endswith("dQw4w9WgXcQ") or "dQw4w9WgXcQ" in payload["external_url"]
    assert payload["cover_url"] == youtube_thumbnail_url("dQw4w9WgXcQ")

    public = client.get("/api/media?category=youtube")
    assert public.status_code == 200
    assert any(row["id"] == payload["id"] for row in public.json())


def test_admin_rejects_invalid_youtube_url(client: TestClient, db: Session) -> None:
    admin = _admin(db)
    token = _login(client, admin.email)
    bad = client.post(
        "/api/admin/media",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "Bad link",
            "category": "youtube",
            "external_url": "https://example.com/not-youtube",
            "published": True,
        },
    )
    assert bad.status_code == 400


def test_admin_publishes_blog_and_public_get(client: TestClient, db: Session) -> None:
    admin = _admin(db)
    token = _login(client, admin.email)

    created = client.post(
        "/api/admin/media",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "FM Tips for Winter",
            "description": "Seasonal checklist",
            "body": "Clear snow from exits and check heating systems weekly.",
            "category": "blog",
            "published": True,
        },
    )
    assert created.status_code == 201, created.text
    post_id = created.json()["id"]
    assert created.json()["body"].startswith("Clear snow")

    listed = client.get("/api/media?category=blog")
    assert listed.status_code == 200
    assert len(listed.json()) == 1

    detail = client.get(f"/api/media/{post_id}")
    assert detail.status_code == 200
    assert detail.json()["title"] == "FM Tips for Winter"

    # Unpublished posts are hidden from public detail
    client.patch(
        f"/api/admin/media/{post_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"published": False},
    )
    hidden = client.get(f"/api/media/{post_id}")
    assert hidden.status_code == 404


def test_category_filter_isolates_channels(client: TestClient, db: Session) -> None:
    admin = _admin(db)
    token = _login(client, admin.email)
    headers = {"Authorization": f"Bearer {token}"}

    yt = client.post(
        "/api/admin/media",
        headers=headers,
        json={
            "title": "Video A",
            "category": "youtube",
            "external_url": "https://youtu.be/aaaaaaaaaaa",
            "published": True,
        },
    )
    assert yt.status_code == 201, yt.text

    pod = client.post(
        "/api/admin/media",
        headers=headers,
        json={
            "title": "Episode A",
            "category": "podcast",
            "external_url": "https://open.spotify.com/episode/abc123",
            "published": True,
        },
    )
    assert pod.status_code == 201, pod.text

    assert len(client.get("/api/media?category=youtube").json()) == 1
    assert len(client.get("/api/media?category=podcast").json()) == 1
    assert db.query(MediaAsset).count() == 2

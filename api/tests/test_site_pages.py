"""Published landing pages, hidden drafts, and one-time seeding."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import SitePage, User
from app.security.auth import hash_password
from app.seeds.site_pages import seed_site_pages

STRONG_PASSWORD = "Str0ng-Password!99"


def _admin(db: Session) -> None:
    user = User(
        full_name="Pages Admin",
        email="pages-admin@example.com",
        phone="+15555550100",
        country="Canada",
        city="Toronto",
        hashed_password=hash_password(STRONG_PASSWORD),
        role="admin",
        membership_status="active",
        email_verified_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.commit()


def _login(client: TestClient) -> str:
    response = client.post(
        "/api/auth/login",
        json={"email": "pages-admin@example.com", "password": STRONG_PASSWORD},
    )
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def _page(title: str, slug: str, *, parent_id: int | None = None, status: str = "published") -> dict:
    return {
        "title": title,
        "menu_label": title,
        "slug": slug,
        "parent_id": parent_id,
        "description": f"{title} description",
        "lead": f"{title} lead",
        "sections": [{"title": "Overview", "body": "A paragraph.", "items": ["One", "Two"]}],
        "cta_label": "Contact",
        "cta_href": "/contact",
        "sort_order": 1,
        "show_in_menu": True,
        "status": status,
    }


def test_published_subpage_is_public_and_draft_is_hidden(client: TestClient, db: Session) -> None:
    _admin(db)
    token = _login(client)
    headers = {"Authorization": f"Bearer {token}"}

    parent = client.post("/api/admin/site-pages", json=_page("Research", "research"), headers=headers)
    assert parent.status_code == 201, parent.text
    parent_id = parent.json()["id"]

    child = client.post(
        "/api/admin/site-pages",
        json=_page("Field notes", "field-notes", parent_id=parent_id),
        headers=headers,
    )
    assert child.status_code == 201, child.text
    assert child.json()["path"] == "/research/field-notes"

    draft = client.post(
        "/api/admin/site-pages",
        json=_page("Private notes", "private-notes", parent_id=parent_id, status="draft"),
        headers=headers,
    )
    assert draft.status_code == 201, draft.text

    published = client.get("/api/site-pages/by-path", params={"path": "/research/field-notes"})
    assert published.status_code == 200, published.text
    assert published.json()["title"] == "Field notes"
    assert published.json()["sections"][0]["items"] == ["One", "Two"]

    hidden = client.get("/api/site-pages/by-path", params={"path": "/research/private-notes"})
    assert hidden.status_code == 404

    nav = client.get("/api/site-pages/nav")
    assert nav.status_code == 200, nav.text
    paths = {item["path"] for item in nav.json()["items"]}
    assert "/research/field-notes" in paths
    assert "/research" in paths
    assert "/research/private-notes" not in paths
    child_item = next(item for item in nav.json()["items"] if item["path"] == "/research/field-notes")
    assert child_item["parent_path"] == "/research"


def test_seeding_the_same_paths_twice_does_not_duplicate(db: Session) -> None:
    seed_site_pages(db)
    first = db.query(SitePage).count()
    assert first >= 11
    staff = db.query(SitePage).filter(SitePage.path == "/about/staff").one()
    assert staff.status == "published"
    assert staff.show_in_menu is True

    seed_site_pages(db)
    assert db.query(SitePage).count() == first
    assert db.query(SitePage).filter(SitePage.path == "/about/staff").count() == 1
    assert db.query(SitePage).filter(SitePage.path == "/about/what-is-built-environment").count() == 0

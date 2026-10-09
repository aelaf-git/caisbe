"""User-style journey: seed → admin edit → public read → draft stays private."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import User
from app.security.auth import hash_password
from app.seeds.site_pages import seed_site_pages

STRONG_PASSWORD = "Str0ng-Password!99"


def _admin(db: Session) -> None:
    db.add(
        User(
            full_name="Journey Admin",
            email="journey-admin@example.com",
            phone="+15555550111",
            country="Canada",
            city="Toronto",
            hashed_password=hash_password(STRONG_PASSWORD),
            role="admin",
            membership_status="active",
            email_verified_at=datetime.now(timezone.utc),
        )
    )
    db.commit()


def _token(client: TestClient) -> str:
    response = client.post(
        "/api/auth/login",
        json={"email": "journey-admin@example.com", "password": STRONG_PASSWORD},
    )
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def test_admin_can_edit_seeded_landing_pages_and_public_site_shows_them(
    client: TestClient, db: Session
) -> None:
    seed_site_pages(db)
    _admin(db)
    headers = {"Authorization": f"Bearer {_token(client)}"}

    # Admin opens the Pages list (seeded marketing pages are present).
    listed = client.get("/api/admin/site-pages", headers=headers)
    assert listed.status_code == 200, listed.text
    pages = listed.json()
    paths = {page["path"] for page in pages}
    for required in (
        "/about",
        "/about/staff",
        "/about/what-is-built-environment",
        "/membership/overview",
        "/events/expo",
        "/network/overview",
        "/partners",
        "/projects",
        "/store",
        "/privacy-policy",
        "/professional-development/learning-formats/online-self-paced",
    ):
        assert required in paths, f"missing seeded page {required}"

    partners = next(page for page in pages if page["path"] == "/partners")
    edited = client.put(
        f"/api/admin/site-pages/{partners['id']}",
        headers=headers,
        json={
            "title": "Partner with CAISBE Today",
            "menu_label": "Become a Partner",
            "slug": "partners",
            "parent_id": None,
            "description": "Edited partner pitch for the public site.",
            "lead": "This lead was updated from Admin Pages.",
            "sections": [
                {
                    "title": "Why partner",
                    "body": "Group enrollment and dedicated support.",
                    "items": ["Visibility", "Training"],
                }
            ],
            "cta_label": "Email partnerships",
            "cta_href": "mailto:info@caisbe.org",
            "sort_order": partners["sort_order"],
            "show_in_menu": True,
            "status": "published",
        },
    )
    assert edited.status_code == 200, edited.text
    assert edited.json()["title"] == "Partner with CAISBE Today"

    # Public visitor opens the partners path and the nav.
    public = client.get("/api/site-pages/by-path", params={"path": "/partners"})
    assert public.status_code == 200, public.text
    assert public.json()["lead"] == "This lead was updated from Admin Pages."
    assert public.json()["sections"][0]["items"] == ["Visibility", "Training"]

    nav = client.get("/api/site-pages/nav")
    assert nav.status_code == 200, nav.text
    nav_paths = {item["path"] for item in nav.json()["items"]}
    assert "/partners" in nav_paths

    # Admin creates a new published subpage under About.
    about = next(page for page in pages if page["path"] == "/about")
    created = client.post(
        "/api/admin/site-pages",
        headers=headers,
        json={
            "title": "Our Story",
            "menu_label": "Our Story",
            "slug": "our-story",
            "parent_id": about["id"],
            "description": "How CAISBE began.",
            "lead": "A short story visitors can read.",
            "sections": [{"title": "Beginnings", "body": "Founded to connect Africa and Canada.", "items": []}],
            "cta_label": None,
            "cta_href": None,
            "sort_order": 99,
            "show_in_menu": True,
            "status": "published",
        },
    )
    assert created.status_code == 201, created.text
    assert created.json()["path"] == "/about/our-story"

    story = client.get("/api/site-pages/by-path", params={"path": "/about/our-story"})
    assert story.status_code == 200, story.text
    assert story.json()["title"] == "Our Story"
    assert "/about/our-story" in {item["path"] for item in client.get("/api/site-pages/nav").json()["items"]}

    # Draft page stays off the public site.
    draft = client.post(
        "/api/admin/site-pages",
        headers=headers,
        json={
            "title": "Secret Draft",
            "menu_label": "Secret Draft",
            "slug": "secret-draft",
            "parent_id": about["id"],
            "description": "Not ready",
            "lead": "Hidden",
            "sections": [],
            "cta_label": None,
            "cta_href": None,
            "sort_order": 100,
            "show_in_menu": True,
            "status": "draft",
        },
    )
    assert draft.status_code == 201, draft.text
    assert client.get("/api/site-pages/by-path", params={"path": "/about/secret-draft"}).status_code == 404
    assert "/about/secret-draft" not in {
        item["path"] for item in client.get("/api/site-pages/nav").json()["items"]
    }

    # Home card can be saved and read publicly.
    home = client.put(
        "/api/admin/site-pages/home",
        headers=headers,
        json={
            "tagline": "Edited tagline for visitors.",
            "hero_intro": "Edited landing sentence for the homepage hero.",
            "stats": [
                {"value": "10+", "label": "Programs"},
                {"value": "20+", "label": "Years"},
                {"value": "100+", "label": "Partners"},
                {"value": "1000+", "label": "Members"},
            ],
        },
    )
    assert home.status_code == 200, home.text
    public_home = client.get("/api/site-pages/home")
    assert public_home.status_code == 200, public_home.text
    assert public_home.json()["tagline"] == "Edited tagline for visitors."
    assert public_home.json()["stats"][0]["value"] == "10+"

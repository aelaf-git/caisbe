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
    assert first >= 30
    staff = db.query(SitePage).filter(SitePage.path == "/about/staff").one()
    assert staff.status == "published"
    assert staff.show_in_menu is True
    built = db.query(SitePage).filter(SitePage.path == "/about/what-is-built-environment").one()
    assert built.status == "published"
    partners = db.query(SitePage).filter(SitePage.path == "/partners").one()
    assert partners.lead
    membership = db.query(SitePage).filter(SitePage.path == "/membership/overview").one()
    assert membership.parent_id is not None

    seed_site_pages(db)
    assert db.query(SitePage).count() == first
    assert db.query(SitePage).filter(SitePage.path == "/about/staff").count() == 1
    assert db.query(SitePage).filter(SitePage.path == "/about/what-is-built-environment").count() == 1
    assert db.query(SitePage).filter(SitePage.path == "/partners").count() == 1


def test_seed_removes_mistaken_professional_development_pages(db: Session) -> None:
    seed_site_pages(db)
    professional = db.query(SitePage).filter(SitePage.path == "/professional-development").one()
    mistaken = SitePage(
        parent_id=professional.id,
        title="ESG + Facility Management",
        menu_label="ESG + Facility Management",
        slug="esg-facility-management",
        path="/professional-development/esg-facility-management",
        description="Mistaken under PD.",
        lead="Should not stay in the menu.",
        sections=[],
        sort_order=99,
        show_in_menu=True,
        status="published",
    )
    db.add(mistaken)
    db.commit()
    assert (
        db.query(SitePage)
        .filter(SitePage.path == "/professional-development/esg-facility-management")
        .count()
        == 1
    )

    seed_site_pages(db)
    assert (
        db.query(SitePage)
        .filter(SitePage.path == "/professional-development/esg-facility-management")
        .count()
        == 0
    )
    assert db.query(SitePage).filter(SitePage.path == "/resources/esg-facility-management").count() == 1


def test_seed_refreshes_network_label_and_corporate_copy(db: Session) -> None:
    seed_site_pages(db)
    overview = db.query(SitePage).filter(SitePage.path == "/network/overview").one()
    overview.title = "Overview / Networking Groups"
    overview.menu_label = "Overview / Networking Groups"
    network = db.query(SitePage).filter(SitePage.path == "/network").one()
    network.cta_label = "Networking Groups"
    network.sections = [
        {
            "title": "Network options",
            "body": "",
            "items": ["Overview / Networking Groups", "Discussion Forum"],
        }
    ]
    corporate = db.query(SitePage).filter(
        SitePage.path == "/professional-development/learning-formats/on-site-corporate-training"
    ).one()
    corporate.description = "Old corporate blurb."
    corporate.sections = [
        {
            "title": "Corporate delivery",
            "body": "Content and scheduling are shaped around your team’s goals and operating context.",
            "items": [],
        }
    ]
    db.commit()

    seed_site_pages(db)
    db.refresh(overview)
    db.refresh(network)
    db.refresh(corporate)

    assert overview.title == "Overview"
    assert overview.menu_label == "Overview"
    assert network.cta_label == "Overview"
    assert network.sections[0]["items"][0] == "Overview"
    assert "Corporate delivery" not in {section["title"] for section in corporate.sections}
    assert corporate.description.startswith("Our corporate programmes are fully tailored")
    assert corporate.cta_label == "Contact us for details"

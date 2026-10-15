"""French content overlay: admin writes, public reads with ?lang=fr, English fallback."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import NewsPost, User
from app.security.auth import hash_password
from app.seeds.site_pages import seed_site_pages

STRONG_PASSWORD = "Str0ng-Password!99"


def _user(db: Session, email: str, role: str) -> None:
    db.add(
        User(
            full_name="Translator",
            email=email,
            phone="+15555550122",
            country="Canada",
            city="Toronto",
            hashed_password=hash_password(STRONG_PASSWORD),
            role=role,
            membership_status="active",
            email_verified_at=datetime.now(timezone.utc),
        )
    )
    db.commit()


def _headers(client: TestClient, email: str) -> dict[str, str]:
    response = client.post("/api/auth/login", json={"email": email, "password": STRONG_PASSWORD})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def _news(db: Session) -> NewsPost:
    row = NewsPost(
        title="Hello",
        slug="hello",
        short_description="Short",
        long_description="<p>Long</p>",
        posted_on=datetime.now(timezone.utc),
        published=True,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def test_french_overlay_with_english_fallback(client: TestClient, db: Session) -> None:
    _user(db, "tr-admin@example.com", "admin")
    headers = _headers(client, "tr-admin@example.com")
    news = _news(db)

    # No translation yet: French request falls back to English.
    fallback = client.get("/api/news", params={"lang": "fr"}).json()
    assert fallback[0]["title"] == "Hello"

    saved = client.put(
        f"/api/admin/translations/news/{news.id}",
        params={"lang": "fr"},
        headers=headers,
        json={
            "fields": {
                "title": "Bonjour <script>alert(1)</script>",
                "short_description": "Court",
                "slug": "hacked",
                "posted_on": "2000-01-01",
            }
        },
    )
    assert saved.status_code == 200, saved.text
    assert saved.json()["fields"]["title"].startswith("Bonjour")
    assert "<script>" not in saved.json()["fields"]["title"]
    assert "slug" not in saved.json()["fields"]

    french = client.get("/api/news", params={"lang": "fr"}).json()[0]
    assert french["short_description"] == "Court"
    assert french["slug"] == "hello"
    # Untranslated field keeps English.
    assert french["long_description"] == "<p>Long</p>"

    english = client.get("/api/news").json()[0]
    assert english["title"] == "Hello"
    assert client.get("/api/news/hello", params={"lang": "fr"}).json()["short_description"] == "Court"


def test_site_page_and_nav_translation(client: TestClient, db: Session) -> None:
    seed_site_pages(db)
    _user(db, "tr-admin2@example.com", "admin")
    headers = _headers(client, "tr-admin2@example.com")

    english_nav = client.get("/api/site-pages/nav").json()["items"]
    assert english_nav
    nav_item = english_nav[0]
    page = client.get("/api/site-pages/by-path", params={"path": nav_item["path"]}).json()
    saved = client.put(
        f"/api/admin/translations/site_page/{page['id']}",
        headers=headers,
        json={
            "fields": {
                "title": "Titre FR",
                "menu_label": "Menu FR",
                "sections": [{"title": "Notre mission", "body": "Corps", "items": ["Un"]}],
            }
        },
    )
    assert saved.status_code == 200, saved.text

    fr = client.get("/api/site-pages/by-path", params={"path": nav_item["path"], "lang": "fr"}).json()
    assert fr["title"] == "Titre FR"
    assert fr["sections"][0]["title"] == "Notre mission"
    nav = client.get("/api/site-pages/nav", params={"lang": "fr"}).json()["items"]
    assert any(item["menu_label"] == "Menu FR" for item in nav)
    assert client.get("/api/site-pages/by-path", params={"path": nav_item["path"]}).json()["title"] == page["title"]


def test_translation_admin_only_and_validation(client: TestClient, db: Session) -> None:
    _user(db, "tr-member@example.com", "member")
    _user(db, "tr-admin3@example.com", "admin")
    news = _news(db)

    member = _headers(client, "tr-member@example.com")
    assert client.get(f"/api/admin/translations/news/{news.id}", headers=member).status_code in (401, 403)
    assert client.put(f"/api/admin/translations/news/{news.id}", headers=member, json={"fields": {}}).status_code in (
        401,
        403,
    )

    admin = _headers(client, "tr-admin3@example.com")
    assert client.get("/api/admin/translations/users/1", headers=admin).status_code == 404
    assert client.get(f"/api/admin/translations/news/{news.id}", params={"lang": "en"}, headers=admin).status_code == 400
    assert client.put("/api/admin/translations/news/99999", headers=admin, json={"fields": {}}).status_code == 404


def test_seed_adds_french_pages_without_overwriting_admin_edits(client: TestClient, db: Session) -> None:
    from app.models import ContentTranslation
    from app.seeds.site_pages import seed_site_pages
    from app.seeds.site_pages_fr import FR_PAGES

    seed_site_pages(db)
    page = client.get("/api/site-pages/by-path", params={"path": "/membership/types", "lang": "fr"}).json()
    assert page["title"] == FR_PAGES["/membership/types"]["title"]
    english = client.get("/api/site-pages/by-path", params={"path": "/membership/types"}).json()
    assert english["title"] == "Membership Categories"

    row = (
        db.query(ContentTranslation)
        .filter(ContentTranslation.entity_type == "site_page", ContentTranslation.entity_id == page["id"])
        .one()
    )
    row.fields = {"title": "Édité par admin"}
    db.commit()
    seed_site_pages(db)
    again = client.get("/api/site-pages/by-path", params={"path": "/membership/types", "lang": "fr"}).json()
    assert again["title"] == "Édité par admin"

    seeded_paths = {p["path"] for p in client.get("/api/site-pages/nav").json()["items"]}
    assert seeded_paths  # sanity

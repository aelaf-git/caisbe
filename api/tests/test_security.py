"""Production defaults, OpenAPI exposure, and credentialed CORS."""

from fastapi.testclient import TestClient

from app.config import (
    DEFAULT_ADMIN_PASSWORD,
    DEFAULT_JWT_SECRET,
    openapi_route_urls,
    settings,
    validate_production_settings,
)
from app.main import app


def test_production_refuses_default_secrets(monkeypatch) -> None:
    monkeypatch.setattr(settings, "app_env", "production")
    monkeypatch.setattr(settings, "jwt_secret", DEFAULT_JWT_SECRET)
    monkeypatch.setattr(settings, "admin_password", "unique-admin-password")
    try:
        validate_production_settings()
        raise AssertionError("default JWT secret was accepted")
    except RuntimeError as exc:
        assert "JWT_SECRET" in str(exc)

    monkeypatch.setattr(settings, "jwt_secret", "unique-jwt-secret")
    monkeypatch.setattr(settings, "admin_password", DEFAULT_ADMIN_PASSWORD)
    try:
        validate_production_settings()
        raise AssertionError("default admin password was accepted")
    except RuntimeError as exc:
        assert "ADMIN_PASSWORD" in str(exc)


def test_development_allows_placeholder_secrets(monkeypatch) -> None:
    monkeypatch.setattr(settings, "app_env", "development")
    monkeypatch.setattr(settings, "jwt_secret", DEFAULT_JWT_SECRET)
    monkeypatch.setattr(settings, "admin_password", DEFAULT_ADMIN_PASSWORD)
    validate_production_settings()


def test_openapi_hidden_in_production(monkeypatch) -> None:
    monkeypatch.setattr(settings, "app_env", "production")
    assert openapi_route_urls() == (None, None, None)


def test_openapi_available_outside_production(client: TestClient) -> None:
    assert app.docs_url == "/docs"
    assert app.redoc_url == "/redoc"
    assert app.openapi_url == "/openapi.json"
    assert client.get("/docs").status_code == 200


def test_cors_ignores_unlisted_render_origins(client: TestClient) -> None:
    response = client.get("/api/health", headers={"Origin": "https://evil.onrender.com"})
    assert response.headers.get("access-control-allow-origin") != "https://evil.onrender.com"


def test_cors_allows_configured_origin(client: TestClient) -> None:
    response = client.options(
        "/api/health",
        headers={
            "Origin": "http://localhost:3002",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization,content-type",
        },
    )
    assert response.headers.get("access-control-allow-origin") == "http://localhost:3002"
    allow_headers = (response.headers.get("access-control-allow-headers") or "").lower()
    assert "authorization" in allow_headers
    assert "content-type" in allow_headers

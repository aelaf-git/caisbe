"""Regression tests for Next.js proxy API_URL → private network rewrite rules.

Mirrors admin/portal/web lib/apiUpstream.ts so Render→Render never uses Cloudflare.
"""

from __future__ import annotations

import re


def normalize_api_base(raw: str | None) -> str:
    value = (raw or "http://127.0.0.1:8000").strip().rstrip("/")
    if not value:
        value = "http://127.0.0.1:8000"

    onrender = re.match(r"^https?://([a-z0-9-]+)\.onrender\.com(?::\d+)?$", value, re.I)
    if onrender:
        return f"http://{onrender.group(1)}:10000"

    if re.match(r"^https?://(www\.)?api\.caisbe\.org(?::\d+)?$", value, re.I):
        return "http://caisbe-api:10000"

    if not re.match(r"^https?://", value, re.I):
        return "http://127.0.0.1:8000"

    return value


def candidate_api_bases(api_url: str | None) -> list[str]:
    configured = normalize_api_base(api_url)
    out = [configured]
    private = re.match(r"^(http://[a-z0-9.-]+):10000$", configured, re.I)
    if private:
        out.append(f"{private.group(1)}:8000")
    # dedupe preserving order
    seen: set[str] = set()
    unique: list[str] = []
    for item in out:
        if item not in seen:
            seen.add(item)
            unique.append(item)
    return unique


def test_local_default() -> None:
    assert normalize_api_base(None) == "http://127.0.0.1:8000"
    assert candidate_api_bases("http://127.0.0.1:8000") == ["http://127.0.0.1:8000"]


def test_prod_private_url() -> None:
    assert candidate_api_bases("http://caisbe-api:10000") == [
        "http://caisbe-api:10000",
        "http://caisbe-api:8000",
    ]


def test_staging_private_url() -> None:
    assert candidate_api_bases("http://caisbe-staging-api-090a:10000") == [
        "http://caisbe-staging-api-090a:10000",
        "http://caisbe-staging-api-090a:8000",
    ]


def test_rewrites_public_onrender_to_private() -> None:
    assert normalize_api_base("https://caisbe-api.onrender.com") == "http://caisbe-api:10000"
    assert (
        normalize_api_base("https://caisbe-staging-api-090a.onrender.com")
        == "http://caisbe-staging-api-090a:10000"
    )


def test_rewrites_api_caisbe_org_to_private() -> None:
    assert normalize_api_base("https://api.caisbe.org") == "http://caisbe-api:10000"


def test_never_includes_public_https_candidates() -> None:
    bases = candidate_api_bases("https://caisbe-api.onrender.com")
    assert all(not b.startswith("https://") for b in bases)
    assert "https://caisbe-api.onrender.com" not in bases

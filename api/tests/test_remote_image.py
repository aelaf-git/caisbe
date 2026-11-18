"""Google Docs image downloads stay on Google hosts."""

import asyncio

import httpx
import pytest
from fastapi import HTTPException

from app.services.remote_image import google_image_host_allowed, save_google_doc_image


def test_only_google_https_hosts_are_allowed():
    assert google_image_host_allowed("https://lh7-rt.googleusercontent.com/docsz/abc")
    assert google_image_host_allowed("https://googleusercontent.com/a.png")
    assert google_image_host_allowed("https://docs.google.com/drawings/d/1/image")
    assert not google_image_host_allowed("http://lh3.googleusercontent.com/a")
    assert not google_image_host_allowed("https://evil.example/a.png")
    assert not google_image_host_allowed("https://googleusercontent.com.evil.example/a")
    assert not google_image_host_allowed("https://docs.google.com.evil.example/a")


class _Response:
    def __init__(self, status, headers=None, url="https://lh3.googleusercontent.com/a", content=b""):
        self.status_code = status
        self.headers = headers or {}
        self.url = url
        self.content = content


class _Client:
    def __init__(self, responses):
        self.responses = list(responses)

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        return None

    async def get(self, url, headers=None):
        return self.responses.pop(0)


def test_redirect_to_another_host_is_rejected(monkeypatch):
    client = _Client([_Response(302, {"location": "https://evil.example/a.png"})])
    monkeypatch.setattr(httpx, "AsyncClient", lambda **kwargs: client)
    with pytest.raises(HTTPException) as exc:
        asyncio.run(save_google_doc_image("https://lh3.googleusercontent.com/a"))
    assert exc.value.status_code == 400


def test_picture_is_stored(monkeypatch):
    png = b"\x89PNG\r\n\x1a\n" + b"x" * 16
    client = _Client([_Response(200, {"content-type": "image/png"}, content=png)])
    monkeypatch.setattr(httpx, "AsyncClient", lambda **kwargs: client)
    monkeypatch.setattr(
        "app.services.remote_image.save_bytes",
        lambda data, **kwargs: "/api/uploads/courses/media/abc.png",
    )
    url, filename = asyncio.run(save_google_doc_image("https://lh3.googleusercontent.com/a"))
    assert url == "/api/uploads/courses/media/abc.png"
    assert filename == "abc.png"


def test_picture_bytes_are_kept_when_the_type_is_generic(monkeypatch):
    png = b"\x89PNG\r\n\x1a\n" + b"x" * 16
    client = _Client([_Response(200, {"content-type": "application/octet-stream"}, content=png)])
    seen: dict[str, str] = {}
    monkeypatch.setattr(httpx, "AsyncClient", lambda **kwargs: client)

    def save(data, **kwargs):
        seen["suffix"] = kwargs["suffix"]
        return "/api/uploads/courses/media/abc.png"

    monkeypatch.setattr("app.services.remote_image.save_bytes", save)
    asyncio.run(save_google_doc_image("https://lh3.googleusercontent.com/a"))
    assert seen["suffix"] == ".png"


def test_non_image_and_oversized_are_rejected(monkeypatch):
    html = _Client([_Response(200, {"content-type": "text/html"}, content=b"<html>")])
    monkeypatch.setattr(httpx, "AsyncClient", lambda **kwargs: html)
    with pytest.raises(HTTPException) as exc:
        asyncio.run(save_google_doc_image("https://docs.google.com/drawings/d/1/image"))
    assert exc.value.status_code == 400

    huge = b"x" * (8 * 1024 * 1024 + 1)
    oversized = _Client([_Response(200, {"content-type": "image/png"}, content=huge)])
    monkeypatch.setattr(httpx, "AsyncClient", lambda **kwargs: oversized)
    with pytest.raises(HTTPException) as exc:
        asyncio.run(save_google_doc_image("https://lh3.googleusercontent.com/a"))
    assert exc.value.status_code == 413

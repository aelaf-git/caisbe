"""Download a Google Docs picture onto CAISBE storage."""

from __future__ import annotations

from urllib.parse import urljoin, urlparse

import httpx
from fastapi import HTTPException, status

from app.services.storage import save_bytes

MAX_REMOTE_IMAGE_BYTES = 8 * 1024 * 1024
_IMAGE_SUFFIXES = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/bmp": ".bmp",
}


def google_image_host_allowed(url: str) -> bool:
    parsed = urlparse(url.strip())
    if parsed.scheme != "https" or not parsed.hostname:
        return False
    host = parsed.hostname.lower().rstrip(".")
    return host == "docs.google.com" or host == "googleusercontent.com" or host.endswith(".googleusercontent.com")


async def save_google_doc_image(url: str) -> tuple[str, str]:
    """Fetch one Google-hosted picture and store it. Returns (url, filename)."""
    current = url.strip()
    if not google_image_host_allowed(current):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="That image address is not from Google Docs.")

    async with httpx.AsyncClient(timeout=20, follow_redirects=False) as client:
        for _ in range(4):
            if not google_image_host_allowed(current):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="That image address is not from Google Docs.",
                )
            response = await client.get(current)
            if response.status_code in {301, 302, 303, 307, 308}:
                location = response.headers.get("location")
                if not location:
                    break
                current = urljoin(str(response.url), location)
                continue
            if response.status_code != 200:
                raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Google did not return the picture.")
            content_type = response.headers.get("content-type", "").split(";", 1)[0].strip().lower()
            suffix = _IMAGE_SUFFIXES.get(content_type)
            if suffix is None:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="That address is not a picture.")
            data = response.content
            if len(data) > MAX_REMOTE_IMAGE_BYTES:
                raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="That picture is too large.")
            stored = save_bytes(data, suffix=suffix, content_type=content_type, folder="courses/media")
            filename = stored.rsplit("/", 1)[-1]
            return stored, filename
    raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Google did not return the picture.")

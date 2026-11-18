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
# Google refuses the picture when the request looks like a script or carries another site's address.
_FETCH_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    ),
    "Accept": "image/png,image/jpeg,image/webp,image/gif,image/*;q=0.8,*/*;q=0.5",
}


def _image_suffix(content_type: str, data: bytes) -> str | None:
    mapped = _IMAGE_SUFFIXES.get(content_type)
    if mapped:
        return mapped
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return ".png"
    if data.startswith(b"\xff\xd8\xff"):
        return ".jpg"
    if data.startswith((b"GIF87a", b"GIF89a")):
        return ".gif"
    if len(data) >= 12 and data.startswith(b"RIFF") and data[8:12] == b"WEBP":
        return ".webp"
    if data.startswith(b"BM"):
        return ".bmp"
    return None


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
            response = await client.get(current, headers=_FETCH_HEADERS)
            if response.status_code in {301, 302, 303, 307, 308}:
                location = response.headers.get("location")
                if not location:
                    break
                current = urljoin(str(response.url), location)
                continue
            if response.status_code != 200:
                raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Google did not return the picture.")
            data = response.content
            content_type = response.headers.get("content-type", "").split(";", 1)[0].strip().lower()
            suffix = _image_suffix(content_type, data)
            if suffix is None:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="That address is not a picture.")
            if content_type not in _IMAGE_SUFFIXES:
                content_type = suffix.removeprefix(".").replace("jpg", "jpeg")
                content_type = f"image/{content_type}"
            if len(data) > MAX_REMOTE_IMAGE_BYTES:
                raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="That picture is too large.")
            stored = save_bytes(data, suffix=suffix, content_type=content_type, folder="courses/media")
            filename = stored.rsplit("/", 1)[-1]
            return stored, filename
    raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Google did not return the picture.")

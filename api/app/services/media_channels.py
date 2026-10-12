"""Helpers for YouTube / podcast / blog MediaAsset channels."""

from __future__ import annotations

import re
from urllib.parse import parse_qs, urlparse

YOUTUBE_HOSTS = {
    "youtube.com",
    "www.youtube.com",
    "m.youtube.com",
    "youtu.be",
    "www.youtu.be",
    "youtube-nocookie.com",
    "www.youtube-nocookie.com",
}

PODCAST_HOST_SUFFIXES = (
    "spotify.com",
    "open.spotify.com",
    "podcasts.apple.com",
    "apple.com",
    "soundcloud.com",
    "anchor.fm",
    "podcasts.google.com",
    "youtu.be",
    "youtube.com",
)

CHANNEL_CATEGORIES = frozenset({"hero", "magazine", "youtube", "podcast", "blog"})
LINK_CATEGORIES = frozenset({"youtube", "podcast", "blog"})

_YOUTUBE_ID_RE = re.compile(r"^[A-Za-z0-9_-]{6,32}$")


def extract_youtube_id(url: str) -> str | None:
    raw = (url or "").strip()
    if not raw:
        return None
    try:
        parsed = urlparse(raw)
    except ValueError:
        return None
    host = (parsed.netloc or "").lower()
    if host not in YOUTUBE_HOSTS:
        return None
    if host in {"youtu.be", "www.youtu.be"}:
        candidate = (parsed.path or "").strip("/").split("/")[0]
        return candidate if _YOUTUBE_ID_RE.match(candidate) else None
    path = (parsed.path or "").strip("/")
    if path.startswith("embed/") or path.startswith("shorts/") or path.startswith("live/"):
        candidate = path.split("/", 1)[1].split("/")[0]
        return candidate if _YOUTUBE_ID_RE.match(candidate) else None
    if path.startswith("watch") or path == "watch":
        vids = parse_qs(parsed.query).get("v") or []
        candidate = vids[0] if vids else ""
        return candidate if _YOUTUBE_ID_RE.match(candidate) else None
    return None


def youtube_thumbnail_url(video_id: str) -> str:
    return f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"


def is_http_url(url: str) -> bool:
    try:
        parsed = urlparse((url or "").strip())
    except ValueError:
        return False
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


def is_podcast_external_url(url: str) -> bool:
    if not is_http_url(url):
        return False
    host = (urlparse(url.strip()).netloc or "").lower()
    if host.startswith("www."):
        host = host[4:]
    if host in YOUTUBE_HOSTS or extract_youtube_id(url):
        return True
    return any(host == suffix or host.endswith(f".{suffix}") for suffix in PODCAST_HOST_SUFFIXES)


def media_public_path(category: str) -> str:
    cat = (category or "").strip().lower()
    if cat == "youtube":
        return "/resources/youtube"
    if cat == "podcast":
        return "/resources/podcast"
    if cat == "blog":
        return "/resources/blog"
    if cat == "magazine":
        return "/resources/magazine"
    return "/resources/media"

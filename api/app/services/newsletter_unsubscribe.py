"""Signed newsletter unsubscribe tokens and public URLs."""

from __future__ import annotations

import hashlib
import hmac
import html
from urllib.parse import quote

from app.config import settings


def _signing_key() -> bytes:
    return (settings.jwt_secret or "").encode("utf-8")


def make_unsubscribe_token(*, subscriber_id: int, email: str) -> str:
    normalized = (email or "").strip().lower()
    payload = f"{int(subscriber_id)}:{normalized}"
    digest = hmac.new(_signing_key(), payload.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{int(subscriber_id)}.{digest}"


def parse_unsubscribe_token(token: str) -> tuple[int, str] | None:
    """Return (subscriber_id, signature) if the token shape is valid; caller verifies HMAC."""
    raw = (token or "").strip()
    if not raw or "." not in raw:
        return None
    left, signature = raw.split(".", 1)
    if not left.isdigit() or not signature or len(signature) != 64:
        return None
    return int(left), signature.lower()


def verify_unsubscribe_token(*, token: str, email: str) -> int | None:
    parsed = parse_unsubscribe_token(token)
    if parsed is None:
        return None
    subscriber_id, signature = parsed
    expected = make_unsubscribe_token(subscriber_id=subscriber_id, email=email)
    expected_sig = expected.split(".", 1)[1]
    if not hmac.compare_digest(signature, expected_sig):
        return None
    return subscriber_id


def unsubscribe_url(*, subscriber_id: int, email: str) -> str:
    base = (settings.web_public_url or "http://localhost:3000").rstrip("/")
    token = make_unsubscribe_token(subscriber_id=subscriber_id, email=email)
    return f"{base}/newsletter/unsubscribe?token={quote(token, safe='')}"


def unsubscribe_footer_html(*, subscriber_id: int, email: str) -> str:
    url = html.escape(unsubscribe_url(subscriber_id=subscriber_id, email=email))
    return f"""
<p style="margin-top:28px;padding-top:16px;border-top:1px solid #e5e5e5;font-size:13px;color:#666666;line-height:1.5;">
  You are receiving this because you subscribed to CAISBE updates.
  <a href="{url}" style="color:#c42032;text-decoration:underline;">Unsubscribe</a>
</p>
""".strip()

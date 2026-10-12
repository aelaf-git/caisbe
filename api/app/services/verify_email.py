"""Email verification message for pending student registrations."""

from __future__ import annotations

import html
import logging
from urllib.parse import quote

from app.config import settings
from app.security.auth import EMAIL_VERIFY_HOURS
from app.services.email import EmailDeliveryError, send_email

logger = logging.getLogger(__name__)


def portal_verify_email_url(token: str, next_path: str = "/membership") -> str:
    base = (settings.portal_public_url or "http://localhost:3002").rstrip("/")
    safe_next = next_path if next_path.startswith("/") else "/membership"
    return (
        f"{base}/auth/verify-email"
        f"?token={quote(token, safe='')}"
        f"&next={quote(safe_next, safe='/')}"
    )


def send_verification_email(
    *,
    to: str,
    full_name: str,
    raw_token: str,
    next_path: str = "/membership",
) -> None:
    if settings.is_production and not settings.resend_api_key.strip():
        raise EmailDeliveryError("Email delivery is not configured.")

    verify_url = portal_verify_email_url(raw_token, next_path)
    if not settings.resend_api_key.strip():
        logger.info("RESEND_API_KEY unset — verification link for %s: %s", to, verify_url)

    name = html.escape((full_name or "").strip() or "there")
    hours = EMAIL_VERIFY_HOURS
    html_body = f"""
<p>Hello {name},</p>
<p>Confirm your email to open your CAISBE student account. Until you verify, your account is not created.</p>
<p>
  <a href="{html.escape(verify_url)}"
     style="display:inline-block;background:#c42032;color:#ffffff;text-decoration:none;
            font-weight:700;padding:12px 22px;border-radius:999px;">
    Verify email and open account
  </a>
</p>
<p>Or paste this link into your browser:<br>
<a href="{html.escape(verify_url)}">{html.escape(verify_url)}</a></p>
<p>This link expires in {hours} hours. If it expires, register again with the same email.</p>
<p>— CAISBE</p>
""".strip()
    send_email(
        to=to,
        subject="Verify your email to open your CAISBE account",
        html_body=html_body,
        purpose="system",
    )

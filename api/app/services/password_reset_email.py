"""Password reset message for verified student accounts."""

from __future__ import annotations

import html
import logging
from urllib.parse import quote

from app.config import settings
from app.security.auth import PASSWORD_RESET_HOURS
from app.services.email import EmailDeliveryError, send_email
from app.services.email_layout import cta_button, fallback_link, wrap_email_html

logger = logging.getLogger(__name__)


def portal_reset_password_url(token: str) -> str:
    base = (settings.portal_public_url or "http://localhost:3002").rstrip("/")
    return f"{base}/auth/reset-password?token={quote(token, safe='')}"


def send_password_reset_email(
    *,
    to: str,
    full_name: str,
    raw_token: str,
) -> None:
    if settings.is_production and not settings.resend_api_key.strip():
        raise EmailDeliveryError("Email delivery is not configured.")

    reset_url = portal_reset_password_url(raw_token)
    if not settings.resend_api_key.strip():
        logger.info("RESEND_API_KEY unset — password reset link for %s: %s", to, reset_url)

    name = html.escape((full_name or "").strip() or "there")
    hours = PASSWORD_RESET_HOURS
    html_body = wrap_email_html(
        f"""
<p style="margin:0 0 14px;">Hello {name},</p>
<p style="margin:0 0 14px;">We received a request to reset your CAISBE portal password.</p>
{cta_button("Reset your password", reset_url)}
{fallback_link(reset_url)}
<p style="margin:18px 0 0;font-size:13px;color:#4b5563;">This link expires in {hours} hour{"s" if hours != 1 else ""}. If you did not request a reset, you can ignore this email.</p>
""".strip(),
        heading="Reset Your Password",
        eyebrow="myCAISBE Portal",
    )
    send_email(
        to=to,
        subject="Reset your CAISBE password",
        html_body=html_body,
        purpose="system",
    )

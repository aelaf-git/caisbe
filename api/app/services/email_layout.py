"""Shared HTML shell for CAISBE transactional emails."""

from __future__ import annotations

import html
from datetime import date, datetime
from urllib.parse import quote

from app.config import settings

BRAND_RED = "#c42032"


def logo_url() -> str:
    base = (settings.web_public_url or "http://localhost:3000").rstrip("/")
    return f"{base}/images/logo.png"


def format_money(amount_cents: int, currency: str = "usd") -> str:
    code = (currency or "usd").upper()
    if code == "USD":
        return f"${amount_cents / 100:,.2f}"
    return f"{amount_cents / 100:,.2f} {code}"


def format_date(value: datetime | date | None) -> str:
    if value is None:
        return ""
    if isinstance(value, datetime):
        value = value.date()
    return value.isoformat()


def cta_button(label: str, href: str) -> str:
    safe_href = html.escape(href)
    safe_label = html.escape(label)
    return f"""
<p>
  <a href="{safe_href}"
     style="display:inline-block;background:{BRAND_RED};color:#ffffff;text-decoration:none;
            font-weight:700;padding:12px 22px;border-radius:999px;">
    {safe_label}
  </a>
</p>
""".strip()


def wrap_email_html(body_html: str) -> str:
    """Wrap inner paragraphs/blocks with CAISBE logo and sign-off."""
    logo = html.escape(logo_url())
    return f"""
<div style="font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;line-height:1.55;max-width:560px;">
  <p style="margin:0 0 20px;">
    <img src="{logo}" alt="CAISBE" width="160" style="display:block;border:0;max-width:160px;height:auto;" />
  </p>
  {body_html.strip()}
  <p style="margin:28px 0 8px;">Best regards,<br>CAISBE</p>
  <p style="margin:0;">
    <img src="{logo}" alt="CAISBE" width="120" style="display:block;border:0;max-width:120px;height:auto;" />
  </p>
</div>
""".strip()


def portal_certificate_url(certificate_code: str) -> str:
    base = (settings.portal_public_url or "http://localhost:3002").rstrip("/")
    if not base.startswith(("http://", "https://")):
        base = f"https://{base.lstrip('/')}"
    code = quote(str(certificate_code).strip(), safe="-._~")
    return f"{base}/certificates/{code}"

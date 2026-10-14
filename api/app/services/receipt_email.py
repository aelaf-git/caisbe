"""Receipt link emailed when an order is paid."""

from __future__ import annotations

import html
import logging
from urllib.parse import quote

from app.config import settings
from app.services.email import send_email
from app.services.email_layout import cta_button, format_money, wrap_email_html

logger = logging.getLogger(__name__)


def receipt_url(order_number: str) -> str:
    base = (settings.portal_public_url or "http://localhost:3002").rstrip("/")
    number = quote(str(order_number).strip(), safe="-._~")
    return f"{base}/account/receipts/{number}"


def send_receipt_email(
    *,
    to: str,
    full_name: str,
    order_number: str,
    amount_cents: int,
    currency: str = "usd",
) -> None:
    url = receipt_url(order_number)
    if not settings.resend_api_key.strip():
        logger.info("RESEND_API_KEY unset — receipt link for %s: %s", to, url)

    name = html.escape((full_name or "").strip() or "there")
    amount = html.escape(format_money(amount_cents, currency))
    safe_url = html.escape(url)
    html_body = wrap_email_html(
        f"""
<p>Hello {name},</p>
<p>Thank you. Your CAISBE payment of {amount} is recorded. Your receipt is ready to view, print, or save as a PDF.</p>
{cta_button("View receipt", url)}
<p>Or paste this link into your browser:<br>
<a href="{safe_url}">{safe_url}</a></p>
""".strip()
    )
    send_email(
        to=to,
        subject=f"Your CAISBE receipt {order_number}",
        html_body=html_body,
        purpose="system",
    )

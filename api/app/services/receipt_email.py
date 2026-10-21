"""Receipt link emailed when an order is paid."""

from __future__ import annotations

import html
import logging
from urllib.parse import quote

from app.config import settings
from app.services.email import send_email
from app.services.email_layout import (
    cta_button,
    detail_box,
    fallback_link,
    format_money,
    wrap_email_html,
)

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
    order_id: int | None = None,
) -> None:
    url = receipt_url(order_number)
    if not settings.resend_api_key.strip():
        logger.info("RESEND_API_KEY unset — receipt link for %s: %s", to, url)

    name = html.escape((full_name or "").strip() or "there")
    raw_amount = format_money(amount_cents, currency)
    amount = html.escape(raw_amount)
    details = detail_box(
        [
            ("Order Number", str(order_number).strip()),
            ("Amount Paid", raw_amount),
        ],
        title="Receipt Summary",
    )
    html_body = wrap_email_html(
        f"""
<p style="margin:0 0 14px;">Hello {name},</p>
<p style="margin:0 0 14px;">Thank you. Your CAISBE payment of <strong>{amount}</strong> is recorded. Your receipt is ready to view, print, or save as a PDF.</p>
{details}
{cta_button("View receipt", url)}
{fallback_link(url)}
""".strip(),
        heading=f"Your CAISBE Receipt ({order_number})",
        eyebrow="myCAISBE Billing",
    )
    send_email(
        to=to,
        subject=f"Your CAISBE receipt {order_number}",
        html_body=html_body,
        purpose="system",
        template_key="receipt",
        related_type="order" if order_id else None,
        related_id=order_id,
    )

"""Course payment confirmation email (sent in addition to the receipt)."""

from __future__ import annotations

import html
import logging
from datetime import datetime

from app.config import settings
from app.services.email import send_email
from app.services.email_layout import detail_box, format_date, format_money, wrap_email_html

logger = logging.getLogger(__name__)


def send_course_payment_email(
    *,
    to: str,
    full_name: str,
    course_title: str,
    amount_cents: int,
    currency: str,
    transaction_id: str,
    paid_at: datetime | None,
) -> None:
    recipient = (to or "").strip()
    if not recipient:
        return
    if not settings.resend_api_key.strip():
        logger.info("RESEND_API_KEY unset — course payment email for %s", recipient)

    name = html.escape((full_name or "").strip() or "there")
    raw_course = (course_title or "").strip() or "your course"
    course = html.escape(raw_course)
    amount = format_money(amount_cents, currency)
    txn = (transaction_id or "").strip() or "N/A"
    when = format_date(paid_at) or format_date(datetime.now())
    details = detail_box(
        [
            ("Amount Paid", amount),
            ("Transaction ID", txn),
            ("Date", when),
        ],
        title="Payment Details",
    )
    html_body = wrap_email_html(
        f"""
<p style="margin:0 0 14px;">Dear {name},</p>
<p style="margin:0 0 14px;">We have successfully received your payment for <strong>{course}</strong>.</p>
{details}
<p style="margin:0 0 14px;">Your course access will be activated shortly. You will receive a separate email with login credentials and course materials.</p>
<p style="margin:0;">Thank you for choosing us.</p>
""".strip(),
        heading="Payment Received",
        eyebrow="myCAISBE Billing",
    )
    send_email(
        to=recipient,
        subject=f"Payment Received – {course_title.strip() or 'CAISBE Course'}",
        html_body=html_body,
        purpose="system",
    )

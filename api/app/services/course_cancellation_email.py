"""Course cancellation confirmation email."""

from __future__ import annotations

import html
import logging
from datetime import datetime

from app.config import settings
from app.services.email import send_email
from app.services.email_layout import format_date, wrap_email_html

logger = logging.getLogger(__name__)

DEFAULT_REFUND_STATUS = "Refund will be processed within 5–10 business days"


def send_course_cancellation_email(
    *,
    to: str,
    full_name: str,
    course_title: str,
    cancelled_at: datetime | None = None,
    refund_status: str = DEFAULT_REFUND_STATUS,
) -> None:
    recipient = (to or "").strip()
    if not recipient:
        return
    if not settings.resend_api_key.strip():
        logger.info("RESEND_API_KEY unset — course cancellation email for %s", recipient)

    name = html.escape((full_name or "").strip() or "there")
    course = html.escape((course_title or "").strip() or "your course")
    when = html.escape(format_date(cancelled_at) or format_date(datetime.now()))
    refund = html.escape((refund_status or DEFAULT_REFUND_STATUS).strip())
    html_body = wrap_email_html(
        f"""
<p>Dear {name},</p>
<p>Your request to cancel the course {course} has been processed successfully.</p>
<p><strong>Cancellation Details:</strong><br>
Cancellation Date: {when}<br>
Refund Status: {refund}</p>
<p>If you have any further questions or would like to register for another course in the future, please feel free to contact us.</p>
<p>We hope to see you again.</p>
""".strip()
    )
    send_email(
        to=recipient,
        subject=f"Course Cancellation Confirmed – {course_title.strip() or 'CAISBE Course'}",
        html_body=html_body,
        purpose="system",
    )

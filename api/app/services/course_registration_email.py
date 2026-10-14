"""Course registration confirmation email."""

from __future__ import annotations

import html
import logging
from datetime import datetime

from app.config import settings
from app.services.email import send_email
from app.services.email_layout import format_date, wrap_email_html

logger = logging.getLogger(__name__)


def send_course_registration_email(
    *,
    to: str,
    full_name: str,
    course_title: str,
    start_date: datetime | None,
    duration: str = "Self-paced",
) -> None:
    recipient = (to or "").strip()
    if not recipient:
        return
    if not settings.resend_api_key.strip():
        logger.info("RESEND_API_KEY unset — course registration email for %s", recipient)

    name = html.escape((full_name or "").strip() or "there")
    course = html.escape((course_title or "").strip() or "your course")
    start = html.escape(format_date(start_date) or "Available now")
    length = html.escape((duration or "Self-paced").strip() or "Self-paced")
    html_body = wrap_email_html(
        f"""
<p>Dear {name},</p>
<p>Thank you for registering for {course}.</p>
<p>Your registration has been successfully received.</p>
<p><strong>Course Start Date:</strong> {start}<br>
<strong>Course Duration:</strong> {length}</p>
<p>You will receive further instructions and access details shortly.</p>
<p>If you have any questions, feel free to reply to this email.</p>
""".strip()
    )
    send_email(
        to=recipient,
        subject=f"Course Registration Confirmed – {course_title.strip() or 'CAISBE Course'}",
        html_body=html_body,
        purpose="system",
    )

"""Course registration confirmation email."""

from __future__ import annotations

import html
import logging
from datetime import datetime

from app.config import settings
from app.services.email import send_email
from app.services.email_layout import detail_box, format_date, wrap_email_html

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
    raw_course = (course_title or "").strip() or "your course"
    course = html.escape(raw_course)
    start = format_date(start_date) or "Available now"
    length = (duration or "Self-paced").strip() or "Self-paced"
    details = detail_box(
        [
            ("Course", raw_course),
            ("Course Start Date", start),
            ("Course Duration", length),
        ],
        title="Registration Summary",
    )
    html_body = wrap_email_html(
        f"""
<p style="margin:0 0 14px;">Dear {name},</p>
<p style="margin:0 0 14px;">Thank you for registering for <strong>{course}</strong>. Your registration has been successfully received.</p>
{details}
<p style="margin:0 0 14px;">You will receive further instructions and access details shortly.</p>
<p style="margin:0;">If you have any questions, feel free to reply to this email.</p>
""".strip(),
        heading="Course Registration Confirmed",
        eyebrow="myCAISBE Courses",
    )
    send_email(
        to=recipient,
        subject=f"Course Registration Confirmed – {course_title.strip() or 'CAISBE Course'}",
        html_body=html_body,
        purpose="system",
    )

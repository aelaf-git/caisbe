"""Course completion and certificate email."""

from __future__ import annotations

import html
import logging

from app.config import settings
from app.services.email import send_email
from app.services.email_layout import (
    cta_button,
    fallback_link,
    portal_certificate_url,
    wrap_email_html,
)

logger = logging.getLogger(__name__)


def send_course_completion_email(
    *,
    to: str,
    full_name: str,
    course_title: str,
    certificate_code: str,
) -> None:
    recipient = (to or "").strip()
    if not recipient:
        return
    if not settings.resend_api_key.strip():
        logger.info("RESEND_API_KEY unset — course completion email for %s", recipient)

    name = html.escape((full_name or "").strip() or "there")
    course = html.escape((course_title or "").strip() or "your course")
    cert_url = portal_certificate_url(certificate_code)
    html_body = wrap_email_html(
        f"""
<p style="margin:0 0 14px;">Dear {name},</p>
<p style="margin:0 0 14px;">Congratulations on successfully completing <strong>{course}</strong>!</p>
<p style="margin:0 0 14px;">We are proud of your achievement. Your certificate of completion is now available.</p>
{cta_button("View Certificate", cert_url)}
{fallback_link(cert_url)}
<p style="margin:18px 0 14px;">We hope you found the course valuable. We would love to hear your feedback.</p>
<p style="margin:0;">Thank you for learning with us.</p>
""".strip(),
        heading="Certificate of Completion Ready",
        eyebrow="myCAISBE Credentials",
    )
    send_email(
        to=recipient,
        subject=f"Congratulations! You've Completed {course_title.strip() or 'your course'}",
        html_body=html_body,
        purpose="system",
    )

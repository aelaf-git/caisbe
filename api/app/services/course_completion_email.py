"""Course completion and certificate email."""

from __future__ import annotations

import html
import logging

from app.config import settings
from app.services.email import send_email
from app.services.email_layout import cta_button, portal_certificate_url, wrap_email_html

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
<p>Dear {name},</p>
<p>Congratulations on successfully completing {course}!</p>
<p>We are proud of your achievement. Your certificate of completion is now available.</p>
{cta_button("View Certificate", cert_url)}
<p>Or paste this link into your browser:<br>
<a href="{html.escape(cert_url)}">{html.escape(cert_url)}</a></p>
<p>We hope you found the course valuable. We would love to hear your feedback.</p>
<p>Thank you for learning with us.</p>
""".strip()
    )
    send_email(
        to=recipient,
        subject=f"Congratulations! You've Completed {course_title.strip() or 'your course'}",
        html_body=html_body,
        purpose="system",
    )

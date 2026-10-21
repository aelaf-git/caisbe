"""Notify admins when a trainee completes course work and needs exam access."""

from __future__ import annotations

import html
import logging
from datetime import date, datetime

from app.config import settings
from app.services.email import EmailDeliveryError, send_email
from app.services.email_layout import (
    admin_base_url,
    cta_button,
    detail_box,
    fallback_link,
    format_date,
    wrap_email_html,
)

logger = logging.getLogger(__name__)


def send_exam_access_request_admin_emails(
    *,
    admin_emails: list[str],
    trainee_name: str,
    trainee_email: str,
    course_title: str,
    completed_at: datetime | date | None = None,
    enrollment_id: int | None = None,
) -> None:
    recipients = sorted({(email or "").strip().lower() for email in admin_emails if (email or "").strip()})
    if not recipients:
        return
    if not settings.resend_api_key.strip():
        logger.info(
            "RESEND_API_KEY unset — exam access request email for %s (%s)",
            trainee_email,
            ", ".join(recipients),
        )

    name = (trainee_name or "").strip() or "A trainee"
    course = (course_title or "").strip() or "a course"
    safe_name = html.escape(name)
    safe_course = html.escape(course)
    access_url = f"{admin_base_url()}/access-control"
    details = detail_box(
        [
            ("Trainee", name),
            ("Email", (trainee_email or "").strip() or "—"),
            ("Course", course),
            ("Completed at", format_date(completed_at) or "Just now"),
        ],
        title="Exam Access Request",
    )
    html_body = wrap_email_html(
        f"""
<p style="margin:0 0 14px;">Hello Admin,</p>
<p style="margin:0 0 14px;">This is to notify you that <strong>{safe_name}</strong> has successfully
completed all modules of <strong>{safe_course}</strong>.</p>
<p style="margin:0 0 14px;">The trainee is now ready to take the final assessment and has requested
access to the examination portal.</p>
{details}
<p style="margin:0 0 14px;">Please log into the administrator dashboard to review their completion
status and grant exam access.</p>
{cta_button("Grant Exam Access", access_url)}
{fallback_link(access_url)}
""".strip(),
        heading="Exam Access Requested",
        eyebrow="myCAISBE Access",
    )
    subject = f"Exam access requested — {name} · {course}"
    for recipient in recipients:
        try:
            send_email(
                to=recipient,
                subject=subject,
                html_body=html_body,
                purpose="system",
                template_key="exam_access_request_admin",
                related_type="enrollment" if enrollment_id else None,
                related_id=enrollment_id,
            )
        except EmailDeliveryError:
            logger.exception("Failed to send exam access request email to %s", recipient)

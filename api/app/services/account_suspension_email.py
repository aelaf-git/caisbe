"""Account suspension and reactivation emails for students."""

from __future__ import annotations

import html
import logging
from datetime import datetime

from app.config import settings
from app.services.email import EmailDeliveryError, send_email
from app.services.email_layout import (
    cta_button,
    detail_box,
    fallback_link,
    format_date,
    portal_base_url,
    wrap_email_html,
)

logger = logging.getLogger(__name__)

SUPPORT_EMAIL = "support@caisbe.org"


def send_account_suspended_email(
    *,
    to: str,
    full_name: str,
    course_title: str,
    account_id: str,
    suspended_at: datetime | None,
    reason: str,
    user_id: int | None = None,
) -> None:
    recipient = (to or "").strip()
    if not recipient:
        return
    if not settings.resend_api_key.strip():
        logger.info("RESEND_API_KEY unset — account suspended email for %s", recipient)

    name = html.escape((full_name or "").strip() or "Student")
    course = html.escape((course_title or "").strip() or "your course")
    account = html.escape((account_id or "").strip() or recipient)
    when = format_date(suspended_at) or format_date(datetime.now())
    reason_text = html.escape((reason or "").strip() or "Administrative review")
    details = detail_box(
        [
            ("Account ID", account),
            ("Date of Suspension", when),
            ("Reason for Suspension", reason_text),
        ],
        title="Suspension Details",
    )
    html_body = wrap_email_html(
        f"""
<p style="margin:0 0 14px;">Dear {name},</p>
<p style="margin:0 0 14px;">
  Please be advised that your access to <strong>{course}</strong> on the myCAISBE portal
  has been temporarily suspended.
</p>
{details}
<p style="margin:18px 0 8px;font-weight:700;">What this means for you:</p>
<p style="margin:0 0 14px;">
  During this suspension period, you will be unable to log in, view course modules, or access
  the examination portal. Your saved progress up to this point remains securely stored in our system.
</p>
<p style="margin:18px 0 8px;font-weight:700;">How to resolve this issue:</p>
<p style="margin:0 0 14px;">
  If you believe this suspension is an error, or if you need to take corrective action to reinstate
  your account, please reply directly to this email or contact support at
  <a href="mailto:{SUPPORT_EMAIL}" style="color:#c42032;font-weight:700;">{SUPPORT_EMAIL}</a>.
</p>
<p style="margin:0;">Sincerely,<br/>The Administration Team<br/>CAISBE</p>
""".strip(),
        heading="Account Suspension Notice",
        eyebrow="myCAISBE Access",
    )
    try:
        send_email(
            to=recipient,
            subject=f"Account Suspension Notice – {course_title.strip() or 'myCAISBE'}",
            html_body=html_body,
            purpose="system",
            reply_to=SUPPORT_EMAIL,
            template_key="account_suspended",
            related_type="user" if user_id else None,
            related_id=user_id,
        )
    except EmailDeliveryError:
        logger.exception("Failed to send account suspended email to %s", recipient)


def send_account_reactivated_email(
    *,
    to: str,
    full_name: str,
    course_title: str,
    course_id: int | None = None,
    user_id: int | None = None,
) -> None:
    recipient = (to or "").strip()
    if not recipient:
        return
    if not settings.resend_api_key.strip():
        logger.info("RESEND_API_KEY unset — account reactivated email for %s", recipient)

    name = html.escape((full_name or "").strip() or "Student")
    course = html.escape((course_title or "").strip() or "your training")
    resume_url = (
        f"{portal_base_url()}/courses/{course_id}"
        if course_id
        else f"{portal_base_url()}/courses"
    )
    html_body = wrap_email_html(
        f"""
<p style="margin:0 0 14px;">Hello {name},</p>
<p style="margin:0 0 14px;">
  Following an administrative review, your profile suspension on the
  <strong>{course}</strong> training platform has been lifted.
</p>
{detail_box(
    [
        ("Current Status", "Authorized"),
        ("Action Required", "None. Your login credentials have been completely re-authorized."),
    ],
    title="Notice of Reactivation",
)}
<p style="margin:0 0 14px;">
  Click the link below to resume your course modules or access your pending exam.
</p>
{cta_button("Resume Training", resume_url)}
{fallback_link(resume_url)}
<p style="margin:18px 0 0;">
  If you experience any technical difficulties logging back in, please reply to this email for support
  at <a href="mailto:{SUPPORT_EMAIL}" style="color:#c42032;font-weight:700;">{SUPPORT_EMAIL}</a>.
</p>
""".strip(),
        heading="Notice of Reactivation",
        eyebrow="myCAISBE Access",
    )
    try:
        send_email(
            to=recipient,
            subject=f"Notice of Reactivation – {course_title.strip() or 'myCAISBE'}",
            html_body=html_body,
            purpose="system",
            reply_to=SUPPORT_EMAIL,
            template_key="account_reactivated",
            related_type="user" if user_id else None,
            related_id=user_id,
        )
    except EmailDeliveryError:
        logger.exception("Failed to send account reactivated email to %s", recipient)

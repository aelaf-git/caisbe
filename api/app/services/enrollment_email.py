"""Enrollment confirmation sent after a course payment succeeds."""

from __future__ import annotations

import html
import logging

from app.config import settings
from app.services.email import EmailAttachment, send_email
from app.services.email_layout import cta_button, fallback_link, portal_base_url, wrap_email_html
from app.services.receipt_email import receipt_url
from app.services.receipt_pdf import receipt_pdf_filename

logger = logging.getLogger(__name__)


def student_first_name(full_name: str, given_name: str | None = None) -> str:
    given = (given_name or "").strip()
    if given:
        return given.split()[0]
    full = (full_name or "").strip()
    if full:
        return full.split()[0]
    return "there"


def send_enrollment_email(
    *,
    to: str,
    full_name: str,
    course_id: int,
    course_title: str,
    order_number: str,
    given_name: str | None = None,
    order_id: int | None = None,
    receipt_pdf: bytes | None = None,
) -> None:
    recipient = (to or "").strip()
    if not recipient:
        return
    if not settings.resend_api_key.strip():
        logger.info("RESEND_API_KEY unset — enrollment email for %s", recipient)

    portal = portal_base_url()
    course_href = f"{portal}/courses/{course_id}"
    dashboard_href = f"{portal}/dashboard"
    receipt_href = receipt_url(order_number)
    first = html.escape(student_first_name(full_name, given_name))
    raw_course = (course_title or "").strip() or "your course"
    course = html.escape(raw_course)
    html_body = wrap_email_html(
        f"""
<p style="margin:0 0 14px;">Hi {first},</p>
<p style="margin:0 0 14px;">You're successfully enrolled in <strong>{course}</strong>.</p>
<p style="margin:0 0 8px;">Start learning now:</p>
{cta_button("Start learning", course_href)}
{fallback_link(course_href, label="Course access link:")}
<p style="margin:18px 0 8px;">Go to your dashboard (myCAISBE):</p>
{cta_button("Open dashboard", dashboard_href)}
{fallback_link(dashboard_href, label="Dashboard link:")}
<p style="margin:18px 0 8px;">View receipt:</p>
{cta_button("View receipt", receipt_href)}
{fallback_link(receipt_href, label="Receipt link:")}
<p style="margin:18px 0 0;">Your payment receipt is attached as a PDF.</p>
<p style="margin:18px 0 0;">Welcome aboard!<br>CAISBE education team</p>
""".strip(),
        heading=f"Enrollment Confirmed – {raw_course}",
        eyebrow="myCAISBE",
        include_signoff=False,
    )
    attachments = None
    if receipt_pdf:
        attachments = [EmailAttachment(receipt_pdf_filename(order_number), receipt_pdf)]
    send_email(
        to=recipient,
        subject=f"Enrollment Confirmed – {raw_course}",
        html_body=html_body,
        purpose="system",
        template_key="enrollment_confirmed",
        related_type="order" if order_id else None,
        related_id=order_id,
        attachments=attachments,
    )

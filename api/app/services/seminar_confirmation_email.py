"""Immediate seminar registration confirmation email."""

from __future__ import annotations

import html
import logging
from datetime import datetime
from urllib.parse import quote

from app.config import settings
from app.models import Seminar, SeminarRegistration
from app.services.email import EmailDeliveryError, send_email
from app.services.email_layout import (
    cta_button,
    detail_box,
    fallback_link,
    format_date,
    web_base_url,
    wrap_email_html,
)

logger = logging.getLogger(__name__)


def seminar_manage_url(seminar_id: int, raw_token: str) -> str:
    base = web_base_url()
    return (
        f"{base}/professional-development/seminars/{seminar_id}/manage"
        f"?token={quote(raw_token, safe='')}"
    )


def attendee_display_name(row: SeminarRegistration) -> str:
    preferred = (row.preferred_name or "").strip()
    if preferred:
        return preferred
    return f"{(row.first_name or '').strip()} {(row.last_name or '').strip()}".strip() or "Attendee"


def where_label_for(seminar: Seminar, attendance: str) -> str:
    if attendance == "virtual":
        url = (seminar.online_join_url or "").strip()
        if url:
            return url
        return "Online — join link is on your registration management page"
    venue = (seminar.venue_address or "").strip()
    if venue:
        return venue
    return (seminar.event_format_label or "").strip() or "Venue details will be confirmed soon"


def when_label_for(seminar: Seminar) -> tuple[str, str]:
    date_label = (seminar.event_date_label or "").strip()
    time_label = (seminar.event_time_label or "").strip()
    if not date_label and seminar.event_starts_at is not None:
        date_label = format_date(seminar.event_starts_at) or ""
        if isinstance(seminar.event_starts_at, datetime):
            time_label = time_label or seminar.event_starts_at.strftime("%I:%M %p").lstrip("0")
    return date_label or "TBA", time_label or "TBA"


def send_seminar_confirmation_email(
    *,
    seminar: Seminar,
    registration: SeminarRegistration,
    raw_manage_token: str,
) -> None:
    recipient = (registration.email or "").strip()
    if not recipient:
        return
    if not settings.resend_api_key.strip():
        logger.info(
            "RESEND_API_KEY unset — seminar confirmation for %s (registration %s)",
            recipient,
            registration.id,
        )

    name = html.escape(attendee_display_name(registration))
    title = html.escape((seminar.title or "").strip() or "Seminar")
    date_label, time_label = when_label_for(seminar)
    where = where_label_for(seminar, registration.attendance)
    ticket = f"#{registration.id}"
    manage_url = seminar_manage_url(seminar.id, raw_manage_token)
    join_url = (seminar.online_join_url or "").strip() if registration.attendance == "virtual" else ""

    details = detail_box(
        [
            ("When", f"{date_label} at {time_label}"),
            ("Where", where),
            ("Ticket Reference", ticket),
        ],
        title="Event access parameters",
    )

    online_block = ""
    if registration.attendance == "virtual":
        if join_url:
            online_block = f"""
<p style="margin:0 0 14px;">
  <strong>If attending Online:</strong> Click this link
  <a href="{html.escape(join_url)}" style="color:#c42032;font-weight:700;">{html.escape(join_url)}</a>
  when the countdown timer hits zero on the event day.
</p>
"""
        else:
            online_block = """
<p style="margin:0 0 14px;">
  <strong>If attending Online:</strong> Open your registration management page on the event day for the join link.
</p>
"""
    in_person_block = ""
    if registration.attendance == "in_person":
        in_person_block = """
<p style="margin:0 0 14px;">
  <strong>If attending In-Person:</strong> Arrive 20 minutes prior to the start time for security screening
  and badge collection.
</p>
"""

    html_body = wrap_email_html(
        f"""
<p style="margin:0 0 14px;">Hello {name},</p>
<p style="margin:0 0 14px;">Your booking for <strong>{title}</strong> is successful. Below are your event access parameters:</p>
{details}
<p style="margin:18px 0 8px;font-weight:700;">Next Steps:</p>
{online_block}
{in_person_block}
<p style="margin:0 0 14px;">
  Need to change or modify your registration details?
  <a href="{html.escape(manage_url)}" style="color:#c42032;font-weight:700;">Manage your registration</a>.
</p>
{cta_button("Manage registration", manage_url)}
{fallback_link(manage_url)}
<p style="margin:18px 0 8px;font-weight:700;">What to bring/prepare:</p>
<p style="margin:0 0 14px;">
  Please have a notepad, pen, or digital tablet ready. If there are any pre-reading materials required
  for this session, they will be accessible directly on your user dashboard.
</p>
<p style="margin:0 0 14px;">We look forward to having you join us!</p>
<p style="margin:0;">Sincerely,<br/>CAISBE Events Team</p>
""".strip(),
        heading="Seminar registration confirmed",
        eyebrow="CAISBE Events",
    )
    try:
        send_email(
            to=recipient,
            subject=f"Registration confirmed: {seminar.title.strip() or 'CAISBE Seminar'}",
            html_body=html_body,
            purpose="system",
            template_key="seminar_registration_confirmed",
            related_type="seminar_registration",
            related_id=registration.id,
        )
    except EmailDeliveryError:
        logger.exception("Failed to send seminar confirmation to %s", recipient)

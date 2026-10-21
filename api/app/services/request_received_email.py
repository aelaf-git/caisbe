"""Generic acknowledgement for contact forms and support tickets."""

from __future__ import annotations

import html
import logging

from sqlalchemy.orm import Session

from app.config import settings
from app.services.email import send_email
from app.services.email_layout import wrap_email_html

logger = logging.getLogger(__name__)

RESPONSE_WINDOW = "24–48 hours"


def send_request_received_email(
    *,
    to: str,
    full_name: str,
    related_type: str | None = None,
    related_id: int | None = None,
    db: Session | None = None,
) -> int | None:
    recipient = (to or "").strip()
    if not recipient:
        return None
    if not settings.resend_api_key.strip():
        logger.info("RESEND_API_KEY unset — request received email for %s", recipient)

    name = html.escape((full_name or "").strip() or "there")
    window = html.escape(RESPONSE_WINDOW)
    html_body = wrap_email_html(
        f"""
<p style="margin:0 0 14px;">Dear {name},</p>
<p style="margin:0 0 14px;">Thank you for contacting us.</p>
<p style="margin:0 0 14px;">We have received your message and will review it shortly. Our team typically responds within <strong>{window}</strong>.</p>
<p style="margin:0 0 14px;">If your matter is urgent, please reply to this email with additional details.</p>
<p style="margin:0;">Thank you for your patience.</p>
""".strip(),
        heading="We've Received Your Request",
        eyebrow="CAISBE Support",
    )
    return send_email(
        to=recipient,
        subject="We've Received Your Request",
        html_body=html_body,
        purpose="contact",
        template_key="request_received",
        related_type=related_type,
        related_id=related_id,
        db=db,
    )

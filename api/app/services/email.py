"""Transactional email via Resend. Logs instead of sending when RESEND_API_KEY is unset."""

from __future__ import annotations

import base64
import logging
import re
from pathlib import Path
from typing import Literal

from app.config import settings

logger = logging.getLogger(__name__)

EmailPurpose = Literal["newsletter", "contact", "info", "system"]


class EmailAttachment:
    def __init__(self, filename: str, content: bytes) -> None:
        self.filename = filename
        self.content = content


class EmailDeliveryError(RuntimeError):
    pass


def from_address_for(purpose: EmailPurpose = "system") -> str:
    """Resolve the Resend From header for a mail purpose."""
    mapping = {
        "newsletter": settings.email_from_newsletter,
        "contact": settings.email_from_contact,
        "info": settings.email_from_info,
        "system": settings.email_from_system,
    }
    # Fall back through purpose → generic EMAIL_FROM → safe default.
    for candidate in (
        mapping.get(purpose, ""),
        settings.email_from,
        "CAISBE <noreply@caisbe.org>",
    ):
        value = (candidate or "").strip()
        if value:
            return value
    return "CAISBE <noreply@caisbe.org>"


def send_email(
    *,
    to: str,
    subject: str,
    html_body: str,
    purpose: EmailPurpose = "system",
    reply_to: str | None = None,
    attachments: list[EmailAttachment] | None = None,
) -> None:
    recipient = to.strip().lower()
    if not recipient:
        raise EmailDeliveryError("Recipient email is required.")

    files = attachments or []
    api_key = settings.resend_api_key.strip()
    from_addr = from_address_for(purpose)

    if not api_key:
        logger.info(
            "RESEND_API_KEY not configured — email not sent (dev mode). "
            "purpose=%s from=%s to=%s subject=%s attachments=%s",
            purpose,
            from_addr,
            recipient,
            subject,
            [item.filename for item in files],
        )
        return

    payload: dict = {
        "from": from_addr,
        "to": [recipient],
        "subject": subject,
        "html": html_body,
        "text": _html_to_plain(html_body),
    }
    reply = (reply_to or "").strip()
    if reply:
        payload["reply_to"] = reply
    if files:
        payload["attachments"] = [
            {
                "filename": item.filename,
                "content": base64.b64encode(item.content).decode("ascii"),
            }
            for item in files
        ]

    try:
        import resend

        resend.api_key = api_key
        resend.Emails.send(payload)
    except EmailDeliveryError:
        raise
    except Exception as exc:
        raise EmailDeliveryError(f"Failed to send email to {recipient}: {exc}") from exc


def _html_to_plain(html: str) -> str:
    text = re.sub(r"<br\s*/?>", "\n", html, flags=re.IGNORECASE)
    text = re.sub(r"</p>", "\n\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)
    return text.strip()


def load_upload_attachment(file_url: str, filename: str) -> EmailAttachment:
    from app.services.storage import is_managed_upload_url, read_managed_bytes

    raw = (file_url or "").strip()
    if not is_managed_upload_url(raw):
        raise EmailDeliveryError("Attachments must be uploaded files from the media library.")
    try:
        content = read_managed_bytes(raw)
    except FileNotFoundError as exc:
        raise EmailDeliveryError(f"Attachment not found: {filename}") from exc
    except Exception as exc:
        raise EmailDeliveryError(f"Unable to load attachment: {filename}") from exc
    safe_name = Path(filename).name or Path(raw.split("?")[0]).name or "attachment"
    return EmailAttachment(filename=safe_name, content=content)

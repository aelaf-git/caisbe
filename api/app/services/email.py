"""Transactional email via Resend. Logs instead of sending when RESEND_API_KEY is unset."""

from __future__ import annotations

import base64
import logging
import re
from pathlib import Path
from typing import Literal

from sqlalchemy.orm import Session

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
    template_key: str | None = None,
    related_type: str | None = None,
    related_id: int | None = None,
    triggered_by_user_id: int | None = None,
    db: Session | None = None,
) -> int | None:
    """Send email via Resend and always archive a row in outbound_emails.

    Returns the outbound_emails.id when persistence succeeds, else None.
    """
    recipient = to.strip().lower()
    if not recipient:
        raise EmailDeliveryError("Recipient email is required.")

    files = attachments or []
    api_key = settings.resend_api_key.strip()
    from_addr = from_address_for(purpose)
    reply = (reply_to or "").strip() or None
    subject_text = (subject or "").strip() or "(no subject)"
    body = html_body or ""

    owns_session = db is None
    session = db
    if owns_session:
        from app.db import SessionLocal

        session = SessionLocal()

    row = None
    row_id: int | None = None
    try:
        from app.models import OutboundEmail

        assert session is not None
        row = OutboundEmail(
            status="skipped_dev" if not api_key else "sent",
            purpose=purpose,
            template_key=(template_key or "").strip() or None,
            from_address=from_addr,
            to_address=recipient,
            subject=subject_text[:500],
            html_body=body,
            reply_to=reply,
            provider="resend",
            related_type=(related_type or "").strip() or None,
            related_id=related_id,
            triggered_by_user_id=triggered_by_user_id,
        )
        session.add(row)
        session.flush()
        row_id = row.id

        if not api_key:
            logger.info(
                "RESEND_API_KEY not configured — email not sent (dev mode). "
                "purpose=%s from=%s to=%s subject=%s attachments=%s outbound_id=%s",
                purpose,
                from_addr,
                recipient,
                subject_text,
                [item.filename for item in files],
                row_id,
            )
            row.status = "skipped_dev"
            if owns_session:
                session.commit()
            return row_id

        payload: dict = {
            "from": from_addr,
            "to": [recipient],
            "subject": subject_text,
            "html": body,
            "text": _html_to_plain(body),
        }
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
            result = resend.Emails.send(payload)
            provider_id = None
            if isinstance(result, dict):
                provider_id = result.get("id")
            elif result is not None:
                provider_id = getattr(result, "id", None)
            row.status = "sent"
            row.provider_message_id = str(provider_id)[:255] if provider_id else None
            if owns_session:
                session.commit()
            return row_id
        except Exception as exc:
            row.status = "failed"
            row.error_message = str(exc)[:4000]
            if owns_session:
                session.commit()
            raise EmailDeliveryError(f"Failed to send email to {recipient}: {exc}") from exc
    except EmailDeliveryError:
        raise
    except Exception:
        logger.exception(
            "Failed to persist outbound email to=%s subject=%s",
            recipient,
            subject_text,
        )
        if owns_session and session is not None:
            try:
                session.rollback()
            except Exception:
                pass
        if not api_key:
            return None
        # Archive failed but key present — still attempt delivery without archive id.
        try:
            import resend

            resend.api_key = api_key
            payload = {
                "from": from_addr,
                "to": [recipient],
                "subject": subject_text,
                "html": body,
                "text": _html_to_plain(body),
            }
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
            resend.Emails.send(payload)
            return None
        except Exception as exc:
            raise EmailDeliveryError(f"Failed to send email to {recipient}: {exc}") from exc
    finally:
        if owns_session and session is not None:
            session.close()


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

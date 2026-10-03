"""Transactional email via SMTP (stdlib). Logs instead of sending when SMTP is not configured."""

from __future__ import annotations

import logging
import mimetypes
import smtplib
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path

from app.config import settings

logger = logging.getLogger(__name__)


class EmailAttachment:
    def __init__(self, filename: str, content: bytes) -> None:
        self.filename = filename
        self.content = content


class EmailDeliveryError(RuntimeError):
    pass


def send_email(
    *,
    to: str,
    subject: str,
    html_body: str,
    attachments: list[EmailAttachment] | None = None,
) -> None:
    recipient = to.strip().lower()
    if not recipient:
        raise EmailDeliveryError("Recipient email is required.")

    files = attachments or []

    if not settings.smtp_host:
        logger.info(
            "SMTP not configured — email not sent (dev mode). to=%s subject=%s attachments=%s",
            recipient,
            subject,
            [item.filename for item in files],
        )
        return

    msg = MIMEMultipart("mixed")
    msg["Subject"] = subject
    msg["From"] = settings.smtp_from
    msg["To"] = recipient

    alternative = MIMEMultipart("alternative")
    plain = _html_to_plain(html_body)
    alternative.attach(MIMEText(plain, "plain", "utf-8"))
    alternative.attach(MIMEText(html_body, "html", "utf-8"))
    msg.attach(alternative)

    for item in files:
        mime_type, _ = mimetypes.guess_type(item.filename)
        maintype, _, subtype = (mime_type or "application/octet-stream").partition("/")
        part = MIMEApplication(item.content, _subtype=subtype or "octet-stream")
        part.add_header("Content-Disposition", "attachment", filename=item.filename)
        if maintype:
            part.set_type(f"{maintype}/{subtype or 'octet-stream'}")
        msg.attach(part)

    try:
        if settings.smtp_use_tls:
            server = smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=30)
            server.starttls()
        else:
            server = smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=30)

        if settings.smtp_user:
            server.login(settings.smtp_user, settings.smtp_password)
        server.sendmail(settings.smtp_from, [recipient], msg.as_string())
        server.quit()
    except smtplib.SMTPException as exc:
        raise EmailDeliveryError(f"Failed to send email to {recipient}: {exc}") from exc


def _html_to_plain(html: str) -> str:
    import re

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

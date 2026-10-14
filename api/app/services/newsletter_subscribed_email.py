"""Newsletter subscription success email."""

from __future__ import annotations

import logging

from app.config import settings
from app.services.email import send_email
from app.services.email_layout import wrap_email_html
from app.services.newsletter_unsubscribe import unsubscribe_footer_html

logger = logging.getLogger(__name__)


def send_newsletter_subscribed_email(*, to: str, subscriber_id: int) -> None:
    recipient = (to or "").strip()
    if not recipient:
        return
    if not settings.resend_api_key.strip():
        logger.info("RESEND_API_KEY unset — newsletter subscribed email for %s", recipient)

    footer = unsubscribe_footer_html(subscriber_id=subscriber_id, email=recipient)
    html_body = wrap_email_html(
        f"""
<p>Thank you! Your subscription has been confirmed.</p>
<p>You will now receive our latest updates, news, and exclusive content directly in your inbox.</p>
<p>Welcome aboard!</p>
{footer}
""".strip()
    )
    send_email(
        to=recipient,
        subject="You're Successfully Subscribed",
        html_body=html_body,
        purpose="newsletter",
    )

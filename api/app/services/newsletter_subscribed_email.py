"""Newsletter subscription success email."""

from __future__ import annotations

import logging

from app.config import settings
from app.services.email import send_email
from app.services.email_layout import wrap_email_html

logger = logging.getLogger(__name__)


def send_newsletter_subscribed_email(*, to: str) -> None:
    recipient = (to or "").strip()
    if not recipient:
        return
    if not settings.resend_api_key.strip():
        logger.info("RESEND_API_KEY unset — newsletter subscribed email for %s", recipient)

    html_body = wrap_email_html(
        """
<p>Thank you! Your subscription has been confirmed.</p>
<p>You will now receive our latest updates, news, and exclusive content directly in your inbox.</p>
<p>If you ever wish to unsubscribe, you can do so at any time using the link at the bottom of our emails.</p>
<p>Welcome aboard!</p>
""".strip()
    )
    send_email(
        to=recipient,
        subject="You're Successfully Subscribed",
        html_body=html_body,
        purpose="newsletter",
    )

"""Newsletter subscription welcome and already-subscribed emails."""

from __future__ import annotations

import html
import logging

from app.config import settings
from app.services.email import send_email
from app.services.email_layout import cta_button, web_base_url, wrap_email_html
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
<p style="margin:0 0 14px;">Thank you! Your subscription has been confirmed.</p>
<p style="margin:0 0 14px;">You will now receive our latest updates, news, magazine issues, and exclusive content directly in your inbox.</p>
<p style="margin:0;">Welcome aboard!</p>
{cta_button("Explore CAISBE", web_base_url())}
""".strip(),
        heading="Subscription Confirmed",
        eyebrow="CAISBE Newsletter",
        footer_extra_html=footer,
    )
    send_email(
        to=recipient,
        subject="You're Successfully Subscribed",
        html_body=html_body,
        purpose="newsletter",
    )


def send_newsletter_already_subscribed_email(*, to: str, subscriber_id: int) -> None:
    recipient = (to or "").strip()
    if not recipient:
        return
    if not settings.resend_api_key.strip():
        logger.info("RESEND_API_KEY unset — newsletter already-subscribed email for %s", recipient)

    safe_email = html.escape(recipient)
    footer = unsubscribe_footer_html(subscriber_id=subscriber_id, email=recipient)
    html_body = wrap_email_html(
        f"""
<p style="margin:0 0 14px;">Good news — <strong>{safe_email}</strong> is already subscribed to the CAISBE newsletter.</p>
<p style="margin:0 0 14px;">No further action is needed. You will continue receiving our latest magazine issues, events, and institute updates in your inbox.</p>
{cta_button("Visit CAISBE", web_base_url())}
""".strip(),
        heading="You're Already Subscribed",
        eyebrow="CAISBE Newsletter",
        footer_extra_html=footer,
    )
    send_email(
        to=recipient,
        subject="You're Already Subscribed to the CAISBE Newsletter",
        html_body=html_body,
        purpose="newsletter",
    )

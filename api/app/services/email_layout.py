"""Shared HTML shell and components for CAISBE transactional and newsletter emails."""

from __future__ import annotations

import html
from datetime import date, datetime
from urllib.parse import quote

from app.config import settings

BRAND_RED = "#c42032"
BRAND_NAVY = "#0f172a"
BRAND_TEXT = "#1f2937"
BRAND_MUTED = "#4b5563"
BRAND_BORDER = "#e5e7eb"
BRAND_CANVAS = "#f4f6f9"
BRAND_FOOTER_BG = "#111111"
INSTITUTE_FULL_NAME = "Canada Africa Institute for the Sustainable Built Environment"
INSTITUTE_ADDRESS = "815-4AVE SW, Calgary, Alberta, T2P 5N7"


def web_base_url() -> str:
    base = (settings.web_public_url or "http://localhost:3000").rstrip("/")
    if not base.startswith(("http://", "https://")):
        base = f"https://{base.lstrip('/')}"
    return base


def portal_base_url() -> str:
    base = (settings.portal_public_url or "http://localhost:3002").rstrip("/")
    if not base.startswith(("http://", "https://")):
        base = f"https://{base.lstrip('/')}"
    return base


def admin_base_url() -> str:
    base = (settings.admin_public_url or "http://localhost:3001").rstrip("/")
    if not base.startswith(("http://", "https://")):
        base = f"https://{base.lstrip('/')}"
    return base


def logo_url() -> str:
    return f"{web_base_url()}/images/logo.png"


def format_money(amount_cents: int, currency: str = "usd") -> str:
    code = (currency or "usd").upper()
    if code == "USD":
        return f"${amount_cents / 100:,.2f}"
    return f"{amount_cents / 100:,.2f} {code}"


def format_date(value: datetime | date | None) -> str:
    if value is None:
        return ""
    if isinstance(value, datetime):
        value = value.date()
    return value.isoformat()


def cta_button(label: str, href: str) -> str:
    safe_href = html.escape(href)
    safe_label = html.escape(label)
    return f"""
<p style="margin:24px 0;">
  <a href="{safe_href}"
     style="display:inline-block;background:{BRAND_RED};color:#ffffff;text-decoration:none;
            font-weight:700;font-size:14px;letter-spacing:0.06em;text-transform:uppercase;
            padding:13px 26px;border-radius:4px;border:2px solid {BRAND_RED};">
    {safe_label}
  </a>
</p>
""".strip()


def fallback_link(url: str, *, label: str = "Or copy and paste this link into your browser:") -> str:
    safe_url = html.escape(url)
    safe_label = html.escape(label)
    return f"""
<p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:{BRAND_MUTED};word-break:break-all;">
  {safe_label}<br>
  <a href="{safe_url}" style="color:{BRAND_RED};text-decoration:underline;">{safe_url}</a>
</p>
""".strip()


def detail_box(rows: list[tuple[str, str]], *, title: str | None = None) -> str:
    """Render a structured key-value callout card with a red left accent border."""
    items_html = []
    for key, value in rows:
        safe_key = html.escape(key)
        safe_val = html.escape(value)
        items_html.append(
            f'<tr>'
            f'<td style="padding:5px 12px 5px 0;font-size:14px;font-weight:600;color:{BRAND_NAVY};white-space:nowrap;vertical-align:top;">{safe_key}</td>'
            f'<td style="padding:5px 0;font-size:14px;color:{BRAND_TEXT};vertical-align:top;">{safe_val}</td>'
            f'</tr>'
        )
    heading_html = (
        f'<p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:{BRAND_RED};">'
        f"{html.escape(title)}"
        f"</p>"
        if title
        else ""
    )
    table_rows = "".join(items_html)
    return f"""
<div style="margin:20px 0;padding:16px 20px;background:#f8fafc;border:1px solid {BRAND_BORDER};border-left:4px solid {BRAND_RED};border-radius:4px;">
  {heading_html}
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
    {table_rows}
  </table>
</div>
""".strip()


def wrap_email_html(
    body_html: str,
    *,
    heading: str | None = None,
    eyebrow: str | None = "CAISBE",
    footer_extra_html: str | None = None,
    include_signoff: bool = True,
) -> str:
    """Wrap inner email HTML in the branded CAISBE card shell and dark institute footer."""
    logo = html.escape(logo_url())
    site_url = html.escape(web_base_url())
    portal_url = html.escape(portal_base_url())
    privacy_url = html.escape(f"{web_base_url()}/privacy-policy")

    eyebrow_cell = (
        f'<td align="right" style="vertical-align:middle;font-size:11px;font-weight:700;'
        f'letter-spacing:0.14em;text-transform:uppercase;color:{BRAND_RED};">'
        f"{html.escape(eyebrow)}"
        f"</td>"
        if eyebrow
        else ""
    )

    heading_block = (
        f'<h1 style="margin:0 0 18px;font-size:22px;line-height:1.3;font-weight:700;color:{BRAND_NAVY};">'
        f"{html.escape(heading)}"
        f"</h1>"
        if heading
        else ""
    )

    signoff_block = (
        f"""
<div style="margin-top:28px;padding-top:20px;border-top:1px solid {BRAND_BORDER};">
  <p style="margin:0;font-size:15px;color:{BRAND_TEXT};line-height:1.5;">
    Best regards,<br>
    <strong style="color:{BRAND_NAVY};">CAISBE Team</strong>
  </p>
</div>
""".strip()
        if include_signoff
        else ""
    )

    extra_footer = (
        f'<div style="margin-top:14px;padding-top:14px;border-top:1px solid #2b2b2b;">{footer_extra_html.strip()}</div>'
        if footer_extra_html and footer_extra_html.strip()
        else ""
    )

    return f"""
<div style="margin:0;padding:32px 16px;background-color:{BRAND_CANVAS};font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:{BRAND_TEXT};line-height:1.6;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" width="100%" style="max-width:600px;margin:0 auto;background-color:#ffffff;border:1px solid {BRAND_BORDER};border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(15,23,42,0.05);">
    <tr>
      <td style="height:4px;background-color:{BRAND_RED};font-size:0;line-height:0;">&nbsp;</td>
    </tr>
    <tr>
      <td style="padding:24px 32px 20px;border-bottom:1px solid {BRAND_BORDER};">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td align="left" style="vertical-align:middle;">
              <a href="{site_url}" style="text-decoration:none;display:inline-block;">
                <img src="{logo}" alt="CAISBE" width="150" style="display:block;border:0;max-width:150px;height:auto;" />
              </a>
            </td>
            {eyebrow_cell}
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:32px;font-size:15px;line-height:1.65;color:{BRAND_TEXT};">
        {heading_block}
        {body_html.strip()}
        {signoff_block}
      </td>
    </tr>
    <tr>
      <td style="padding:24px 32px;background-color:{BRAND_FOOTER_BG};color:#d1d5db;font-size:12px;line-height:1.6;">
        <p style="margin:0 0 4px;font-weight:700;color:#ffffff;font-size:13px;">
          {INSTITUTE_FULL_NAME} (CAISBE)
        </p>
        <p style="margin:0 0 12px;color:#9ca3af;">
          {INSTITUTE_ADDRESS}
        </p>
        <p style="margin:0;">
          <a href="{site_url}" style="color:#ffffff;text-decoration:underline;">Website</a>
          &nbsp;&bull;&nbsp;
          <a href="{portal_url}" style="color:#ffffff;text-decoration:underline;">myCAISBE Portal</a>
          &nbsp;&bull;&nbsp;
          <a href="{privacy_url}" style="color:#ffffff;text-decoration:underline;">Privacy Policy</a>
        </p>
        {extra_footer}
      </td>
    </tr>
  </table>
</div>
""".strip()


def portal_certificate_url(certificate_code: str) -> str:
    base = portal_base_url()
    code = quote(str(certificate_code).strip(), safe="-._~")
    return f"{base}/certificates/{code}"


def newsletter_starter_body_html() -> str:
    """Default inner HTML for the Admin newsletter composer (wrapped on send)."""
    membership = f"{web_base_url()}/membership"
    return f"""
<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:{BRAND_TEXT};">
  Hello,
</p>
<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:{BRAND_TEXT};">
  Here are the latest updates from CAISBE — membership news, learning opportunities,
  and highlights for facility and property management professionals.
</p>
<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:{BRAND_TEXT};">
  <!-- Replace this paragraph with your newsletter content. -->
</p>
{cta_button("Join CAISBE", membership)}
<p style="margin:24px 0 0;font-size:15px;line-height:1.6;color:{BRAND_MUTED};">
  Thank you for being part of the CAISBE community.
</p>
""".strip()


def newsletter_starter_subject() -> str:
    return "CAISBE Newsletter"

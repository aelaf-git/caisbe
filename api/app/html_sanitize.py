"""Sanitize rich-text HTML from TipTap before persisting LMS content."""

from __future__ import annotations

import re

import bleach
from bleach.css_sanitizer import CSSSanitizer

ALLOWED_TAGS = [
    "p",
    "br",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "s",
    "sub",
    "sup",
    "h1",
    "h2",
    "h3",
    "ul",
    "ol",
    "li",
    "a",
    "img",
    "blockquote",
    "code",
    "pre",
    "span",
    "mark",
    "hr",
]

ALLOWED_ATTRIBUTES = {
    "a": ["href", "title", "target", "rel", "class"],
    "img": ["src", "alt", "title", "class"],
    "span": ["class", "style"],
    "mark": ["class", "style"],
    "p": ["class", "style"],
    "h1": ["class", "style"],
    "h2": ["class", "style"],
    "h3": ["class", "style"],
    "code": ["class"],
    "pre": ["class"],
}

ALLOWED_PROTOCOLS = ["http", "https", "mailto"]

CSS_SANITIZER = CSSSanitizer(
    allowed_css_properties=[
        "font-size",
        "color",
        "background-color",
        "text-align",
    ],
)

_BLANK_TARGET_ANCHOR = re.compile(r"(<a\b[^>]*\btarget\s*=\s*['\"]?_blank['\"]?)([^>]*>)", re.IGNORECASE)


def _harden_links(html: str) -> str:
    def add_rel(match: re.Match[str]) -> str:
        opening, closing = match.group(1), match.group(2)
        if re.search(r"\brel\s*=", opening, re.IGNORECASE):
            if "noopener" not in opening.lower():
                opening = f'{opening} rel="noopener noreferrer"'
        else:
            opening = f'{opening} rel="noopener noreferrer"'
        return opening + closing

    return _BLANK_TARGET_ANCHOR.sub(add_rel, html)


def sanitize_html(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = bleach.clean(
        value,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRIBUTES,
        protocols=ALLOWED_PROTOCOLS,
        css_sanitizer=CSS_SANITIZER,
        strip=True,
    )
    return _harden_links(cleaned)


def strip_plain_text(value: str | None) -> str | None:
    if value is None:
        return None
    return bleach.clean(value, tags=[], attributes={}, strip=True).strip()

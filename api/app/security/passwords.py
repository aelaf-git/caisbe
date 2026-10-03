"""Password strength helpers (OWASP-aligned)."""

from __future__ import annotations

import re

MIN_PASSWORD_LENGTH = 12
MAX_PASSWORD_LENGTH = 128

_SPECIAL_RE = re.compile(r"[!@#$%^&*()_\-+=\[\]{};:'\",.<>/?\\|`~]")
_COMMON_PASSWORDS = {
    "password",
    "password123",
    "password123!",
    "123456789012",
    "qwertyuiop12",
    "letmein12345",
    "welcome12345",
    "adminadmin12",
    "changeme1234",
    "iloveyou1234",
}


def validate_password_strength(password: str) -> str:
    """Validate and return a cleaned password, or raise ValueError with a user-facing message."""
    if password is None:
        raise ValueError("Password is required.")
    value = password.strip()
    if value != password:
        raise ValueError("Password cannot start or end with spaces.")
    if len(value) < MIN_PASSWORD_LENGTH:
        raise ValueError(f"Password must be at least {MIN_PASSWORD_LENGTH} characters.")
    if len(value) > MAX_PASSWORD_LENGTH:
        raise ValueError(f"Password must be at most {MAX_PASSWORD_LENGTH} characters.")
    if not re.search(r"[a-z]", value):
        raise ValueError("Password must include at least one lowercase letter.")
    if not re.search(r"[A-Z]", value):
        raise ValueError("Password must include at least one uppercase letter.")
    if not re.search(r"\d", value):
        raise ValueError("Password must include at least one number.")
    if not _SPECIAL_RE.search(value):
        raise ValueError("Password must include at least one special character.")
    if value.lower() in _COMMON_PASSWORDS:
        raise ValueError("This password is too common. Choose a stronger password.")
    if re.fullmatch(r"(.)\1+", value):
        raise ValueError("Password cannot be a repeated single character.")
    return value

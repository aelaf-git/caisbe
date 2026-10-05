"""Unit tests for password hashing and strength."""

from app.security.auth import (
    LOGIN_LOCKOUT_MINUTES,
    LOGIN_MAX_FAILURES,
    hash_password,
    verify_password,
    verify_password_or_dummy,
)
from app.security.passwords import validate_password_strength
import pytest


def test_lockout_constants() -> None:
    assert LOGIN_MAX_FAILURES == 5
    assert LOGIN_LOCKOUT_MINUTES == 15


def test_hash_and_verify_password() -> None:
    hashed = hash_password("Str0ng-Password!99")
    assert verify_password("Str0ng-Password!99", hashed)
    assert not verify_password("wrong-password!!", hashed)


def test_verify_password_or_dummy_missing_hash() -> None:
    assert not verify_password_or_dummy("anything-here!!", None)


def test_verify_password_or_dummy_with_real_hash() -> None:
    hashed = hash_password("Str0ng-Password!99")
    assert verify_password_or_dummy("Str0ng-Password!99", hashed)
    assert not verify_password_or_dummy("nope-not-it!!!!", hashed)


def test_password_strength_rejects_short() -> None:
    with pytest.raises(ValueError, match="at least"):
        validate_password_strength("Ab1!short")


def test_password_strength_accepts_strong() -> None:
    assert validate_password_strength("Str0ng-Password!99") == "Str0ng-Password!99"

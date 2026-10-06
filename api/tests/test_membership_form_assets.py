"""Membership registration form static assets used by download links."""

from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
FORMS_DIR = REPO_ROOT / "web" / "public" / "forms"
PDF_PATH = FORMS_DIR / "caisbe-membership-registration.pdf"
DOCX_PATH = FORMS_DIR / "caisbe-membership-registration.docx"


def test_membership_registration_pdf_is_uploaded() -> None:
    assert PDF_PATH.is_file(), f"Missing membership PDF at {PDF_PATH}"
    assert PDF_PATH.stat().st_size > 1000
    assert PDF_PATH.read_bytes()[:5] == b"%PDF-"


def test_membership_registration_docx_is_present() -> None:
    assert DOCX_PATH.is_file(), f"Missing membership Word form at {DOCX_PATH}"
    assert DOCX_PATH.stat().st_size > 1000
    # DOCX is a ZIP package
    assert DOCX_PATH.read_bytes()[:2] == b"PK"

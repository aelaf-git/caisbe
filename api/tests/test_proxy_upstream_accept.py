"""Proxy upstream acceptance rules (mirrors Next.js isAcceptableUpstream)."""


def is_unusable_upstream(status: int, content_type: str, preview: str) -> bool:
    ctype = content_type.lower()
    if "text/html" in ctype:
        return True
    if status == 403 and ("error 1000" in preview.lower() or "prohibited ip" in preview.lower()):
        return True
    if "dns points to prohibited ip" in preview.lower():
        return True
    return False


def looks_like_json(content_type: str, preview: str) -> bool:
    ctype = content_type.lower()
    if "application/json" in ctype or "application/problem+json" in ctype:
        return True
    trimmed = preview.lstrip()
    return trimmed.startswith("{") or trimmed.startswith("[")


def is_acceptable_upstream(
    status: int,
    content_type: str,
    preview: str,
    body_byte_length: int,
) -> bool:
    if is_unusable_upstream(status, content_type, preview):
        return False
    if 200 <= status < 300 and (status in (204, 205) or body_byte_length == 0):
        return True
    return looks_like_json(content_type, preview)


def test_accepts_204_no_content() -> None:
    assert is_acceptable_upstream(204, "", "", 0) is True


def test_accepts_empty_200() -> None:
    assert is_acceptable_upstream(200, "", "", 0) is True


def test_accepts_json_200() -> None:
    assert is_acceptable_upstream(200, "application/json", '{"ok":true}', 11) is True


def test_rejects_html_502_style() -> None:
    assert is_acceptable_upstream(200, "text/html", "<!DOCTYPE html>Error 1000", 40) is False


def test_rejects_cf_error_1000() -> None:
    assert (
        is_acceptable_upstream(403, "text/plain", "Error 1000: DNS points to prohibited IP", 40)
        is False
    )


def test_rejects_non_json_error_body() -> None:
    assert is_acceptable_upstream(500, "text/plain", "Internal Server Error", 21) is False

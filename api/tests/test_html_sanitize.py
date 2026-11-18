from app.security.html_sanitize import sanitize_html


def test_table_with_colspan_survives() -> None:
    html = '<table><tbody><tr><td colspan="2" style="text-align: center">A</td><td>B</td></tr></tbody></table>'
    cleaned = sanitize_html(html) or ""
    assert "<table>" in cleaned
    assert 'colspan="2"' in cleaned
    assert "text-align" in cleaned
    assert ">A<" in cleaned
    assert ">B<" in cleaned


def test_script_and_data_image_do_not_survive() -> None:
    html = (
        "<p>Hi</p><script>alert(1)</script>"
        '<img src="data:image/png;base64,aaaa" alt="x">'
        '<img src="/api/uploads/courses/media/abc.png" alt="ok">'
    )
    cleaned = sanitize_html(html) or ""
    assert "script" not in cleaned.lower()
    assert "alert" not in cleaned.lower()
    assert "data:image" not in cleaned
    assert "/api/uploads/courses/media/abc.png" in cleaned

"""One-page payment receipt PDF, built without an extra PDF library."""

from __future__ import annotations

from datetime import datetime

from app.services.email_layout import format_date, format_money


def _escape(value: str) -> str:
    cleaned = value.replace("\r", " ").replace("\n", " ")
    return cleaned.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def build_receipt_pdf(lines: list[str]) -> bytes:
    """Return a single portrait page of Helvetica text."""
    commands = ["BT", "/F1 16 Tf", "72 740 Td"]
    for index, line in enumerate(lines):
        if index == 0:
            commands.append(f"({_escape(line)}) Tj")
            commands.append("/F1 11 Tf")
        else:
            commands.append("0 -20 Td")
            commands.append(f"({_escape(line)}) Tj")
    commands.append("ET")
    stream = "\n".join(commands).encode("latin-1", errors="replace")

    objects: list[bytes] = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
        b"<< /Length " + str(len(stream)).encode("ascii") + b" >>\nstream\n" + stream + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]

    output = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for number, body in enumerate(objects, start=1):
        offsets.append(len(output))
        output.extend(f"{number} 0 obj\n".encode("ascii"))
        output.extend(body)
        output.extend(b"\nendobj\n")

    xref_at = len(output)
    output.extend(f"xref\n0 {len(objects) + 1}\n".encode("ascii"))
    output.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        output.extend(f"{offset:010d} 00000 n \n".encode("ascii"))
    output.extend(
        (
            f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\n"
            f"startxref\n{xref_at}\n%%EOF\n"
        ).encode("ascii")
    )
    return bytes(output)


def receipt_pdf_filename(order_number: str) -> str:
    stem = "".join(ch if ch.isalnum() or ch in "-._" else "-" for ch in order_number.strip())
    stem = stem.strip("-") or "receipt"
    return f"caisbe-receipt-{stem}.pdf"


def build_order_receipt_pdf(
    *,
    order_number: str,
    amount_cents: int,
    currency: str,
    paid_at: datetime | None,
    course_titles: list[str],
) -> bytes:
    courses = [title.strip() for title in course_titles if title and title.strip()]
    lines = [
        "CAISBE payment receipt",
        f"Order: {order_number}",
        f"Date: {format_date(paid_at) or 'Today'}",
        f"Amount: {format_money(amount_cents, currency)}",
        "Courses: " + (", ".join(courses) if courses else "Course enrollment"),
        "Payment: Credit card",
        "CAISBE education team",
    ]
    return build_receipt_pdf(lines)

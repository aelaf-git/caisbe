"""Portal and admin favicons must be transparent PNGs."""

from __future__ import annotations

import struct
import zlib
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
FAVICONS = [
    REPO_ROOT / "portal" / "public" / "images" / "favicon.png",
    REPO_ROOT / "admin" / "public" / "images" / "favicon.png",
]


def _png_chunks(data: bytes) -> list[tuple[bytes, bytes]]:
    assert data.startswith(b"\x89PNG\r\n\x1a\n"), "Not a PNG file"
    offset = 8
    chunks: list[tuple[bytes, bytes]] = []
    while offset + 8 <= len(data):
        length = struct.unpack(">I", data[offset : offset + 4])[0]
        ctype = data[offset + 4 : offset + 8]
        chunk_data = data[offset + 8 : offset + 8 + length]
        chunks.append((ctype, chunk_data))
        offset += 12 + length
        if ctype == b"IEND":
            break
    return chunks


def _assert_transparent_png(path: Path) -> None:
    assert path.is_file(), f"Missing favicon at {path}"
    data = path.read_bytes()
    chunks = _png_chunks(data)
    ihdr = next(payload for ctype, payload in chunks if ctype == b"IHDR")
    width, height, bit_depth, color_type = struct.unpack(">IIBB", ihdr[:10])
    assert width > 0 and height > 0
    # Color type 4 = grayscale+alpha, 6 = RGBA. Palette with tRNS also counts.
    has_trns = any(ctype == b"tRNS" for ctype, _ in chunks)
    assert color_type in (4, 6) or has_trns, (
        f"{path} is not a transparent PNG (color_type={color_type}, tRNS={has_trns})"
    )

    if color_type == 6 and bit_depth == 8:
        idat = b"".join(payload for ctype, payload in chunks if ctype == b"IDAT")
        raw = zlib.decompress(idat)
        # Filter byte + RGBA per scanline
        stride = 1 + width * 4
        assert len(raw) >= height * stride
        alphas = []
        for y in range(height):
            row = raw[y * stride + 1 : (y + 1) * stride]
            alphas.extend(row[3::4])
        assert any(a == 0 for a in alphas), f"{path} has no fully transparent pixels"
        assert any(a > 200 for a in alphas), f"{path} has no opaque logo pixels"


def test_portal_favicon_is_transparent_png() -> None:
    _assert_transparent_png(FAVICONS[0])


def test_admin_favicon_is_transparent_png() -> None:
    _assert_transparent_png(FAVICONS[1])

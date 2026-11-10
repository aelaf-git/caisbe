"""Managed uploads are removed from disk or Cloudflare R2 without failing the caller."""

from __future__ import annotations

from pathlib import Path

from app.config import settings
from app.services import storage


def test_local_delete_removes_managed_file_and_ignores_other_links(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setattr(settings, "upload_dir", str(tmp_path))
    monkeypatch.setattr(storage, "object_storage_enabled", lambda: False)
    url = "/api/uploads/news/" + ("ab" * 16) + ".png"
    dest = tmp_path / "news" / (url.rsplit("/", 1)[-1])
    dest.parent.mkdir()
    dest.write_bytes(b"png")

    storage.delete_managed_upload(url)
    assert not dest.exists()

    storage.delete_managed_upload(url)
    storage.delete_managed_upload("")
    storage.delete_managed_upload("https://www.youtube.com/watch?v=example")
    storage.delete_managed_uploads([None, url, "https://example.com/article"])


def test_object_delete_uses_the_upload_key_and_swallows_errors(monkeypatch) -> None:
    deleted: list[str] = []

    def fail_delete(key: str) -> None:
        deleted.append(key)
        raise RuntimeError("missing")

    monkeypatch.setattr(storage, "object_storage_enabled", lambda: True)
    monkeypatch.setattr(storage, "_delete_object_key", fail_delete)
    url = "https://files.example.com/uploads/jobs/" + ("cd" * 16) + ".pdf"

    storage.delete_managed_upload(url)

    assert deleted == [f"uploads/jobs/{'cd' * 16}.pdf"]

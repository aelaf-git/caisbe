"""Local disk or S3-compatible object storage (Cloudflare R2, AWS S3, etc.)."""

from __future__ import annotations

import asyncio
import re
import tempfile
import uuid
from pathlib import Path
from typing import BinaryIO
from urllib.parse import urlparse
from urllib.request import urlopen

from fastapi import HTTPException, UploadFile, status
from starlette.datastructures import UploadFile as StarletteUploadFile

from app.config import settings

UPLOAD_KEY_PREFIX = "uploads/"
_MANAGED_OBJECT_RE = re.compile(
    r"(?:/api/uploads/|/uploads/)([a-f0-9]{32}\.[a-z0-9]+)$",
    re.IGNORECASE,
)


def object_storage_enabled() -> bool:
    return bool(
        settings.s3_endpoint.strip()
        and settings.s3_bucket.strip()
        and settings.s3_access_key.strip()
        and settings.s3_secret_key.strip()
        and settings.s3_public_base_url.strip()
    )


def is_managed_upload_url(url: str | None) -> bool:
    """True for local /api/uploads/… or object-storage …/uploads/<uuid>.<ext> URLs."""
    if not url or not url.strip():
        return False
    path = url.strip().split("?")[0]
    if "/api/uploads/" in path:
        return True
    if _MANAGED_OBJECT_RE.search(path):
        return True
    base = settings.s3_public_base_url.strip().rstrip("/")
    if base and path.startswith(base + "/") and "/uploads/" in path:
        return True
    return False


def public_url_for_key(key: str) -> str:
    return f"{settings.s3_public_base_url.rstrip('/')}/{key.lstrip('/')}"


def _s3_client():
    import boto3
    from botocore.config import Config

    return boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint.strip(),
        aws_access_key_id=settings.s3_access_key.strip(),
        aws_secret_access_key=settings.s3_secret_key.strip(),
        region_name=(settings.s3_region or "auto").strip() or "auto",
        config=Config(signature_version="s3v4"),
    )


def _put_fileobj(fileobj: BinaryIO, key: str, content_type: str | None) -> None:
    client = _s3_client()
    extra: dict[str, str] = {}
    if content_type:
        extra["ContentType"] = content_type
    if extra:
        client.upload_fileobj(fileobj, settings.s3_bucket.strip(), key, ExtraArgs=extra)
    else:
        client.upload_fileobj(fileobj, settings.s3_bucket.strip(), key)


def _put_bytes(data: bytes, key: str, content_type: str | None) -> None:
    client = _s3_client()
    kwargs: dict = {
        "Bucket": settings.s3_bucket.strip(),
        "Key": key,
        "Body": data,
    }
    if content_type:
        kwargs["ContentType"] = content_type
    client.put_object(**kwargs)


def save_bytes(data: bytes, *, suffix: str, content_type: str | None = None) -> str:
    if not data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty")
    safe_name = f"{uuid.uuid4().hex}{suffix.lower()}"
    if object_storage_enabled():
        key = f"{UPLOAD_KEY_PREFIX}{safe_name}"
        _put_bytes(data, key, content_type)
        return public_url_for_key(key)

    root = Path(settings.upload_dir)
    root.mkdir(parents=True, exist_ok=True)
    dest = root / safe_name
    dest.write_bytes(data)
    return f"/api/uploads/{safe_name}"


async def save_upload(
    uploaded: UploadFile | StarletteUploadFile,
    *,
    allowed_suffixes: set[str],
    max_bytes: int,
    invalid_detail: str = "File type not allowed.",
    empty_detail: str = "Uploaded file is empty",
    too_large_detail: str | None = None,
) -> tuple[str, str]:
    """Stream an upload to object storage or local disk. Returns (url, display_filename)."""
    suffix = Path(uploaded.filename or "file").suffix.lower()
    if suffix not in allowed_suffixes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=invalid_detail)

    too_large = too_large_detail or f"File is too large. Maximum size is {max_bytes // (1024 * 1024)} MB."
    content_type = (uploaded.content_type or "").strip() or None
    safe_name = f"{uuid.uuid4().hex}{suffix}"
    written = 0
    chunk_size = 1024 * 1024

    if object_storage_enabled():
        key = f"{UPLOAD_KEY_PREFIX}{safe_name}"
        with tempfile.SpooledTemporaryFile(max_size=8 * 1024 * 1024) as tmp:
            while True:
                chunk = await uploaded.read(chunk_size)
                if not chunk:
                    break
                written += len(chunk)
                if written > max_bytes:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=too_large,
                    )
                tmp.write(chunk)
            if written == 0:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=empty_detail)
            tmp.seek(0)
            await asyncio.to_thread(_put_fileobj, tmp, key, content_type)
        display = (uploaded.filename or safe_name)[:120]
        return public_url_for_key(key), display

    root = Path(settings.upload_dir)
    root.mkdir(parents=True, exist_ok=True)
    dest = root / safe_name
    try:
        with dest.open("wb") as out:
            while True:
                chunk = await uploaded.read(chunk_size)
                if not chunk:
                    break
                written += len(chunk)
                if written > max_bytes:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=too_large,
                    )
                out.write(chunk)
    except Exception:
        dest.unlink(missing_ok=True)
        raise
    if written == 0:
        dest.unlink(missing_ok=True)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=empty_detail)
    display = (uploaded.filename or safe_name)[:120]
    return f"/api/uploads/{safe_name}", display


def read_managed_bytes(file_url: str) -> bytes:
    """Load bytes for a managed upload URL (local disk or object storage)."""
    raw = (file_url or "").strip()
    if not is_managed_upload_url(raw):
        raise FileNotFoundError("Not a managed upload URL")

    path = raw.split("?")[0]
    match = _MANAGED_OBJECT_RE.search(path)
    stored_name = match.group(1) if match else Path(urlparse(path).path).name
    if not stored_name or stored_name in {".", ".."}:
        raise FileNotFoundError("Invalid upload path")

    # Legacy / local API-served files
    if "/api/uploads/" in path:
        dest = Path(settings.upload_dir) / stored_name
        if dest.is_file():
            return dest.read_bytes()
        # May have been migrated to object storage under the same name
        if object_storage_enabled():
            key = f"{UPLOAD_KEY_PREFIX}{stored_name}"
            response = _s3_client().get_object(Bucket=settings.s3_bucket.strip(), Key=key)
            return response["Body"].read()
        raise FileNotFoundError(stored_name)

    if object_storage_enabled():
        key = f"{UPLOAD_KEY_PREFIX}{stored_name}"
        try:
            response = _s3_client().get_object(Bucket=settings.s3_bucket.strip(), Key=key)
            return response["Body"].read()
        except Exception:
            with urlopen(raw, timeout=60) as resp:  # noqa: S310 — managed public upload URLs
                return resp.read()

    with urlopen(raw, timeout=60) as resp:  # noqa: S310
        return resp.read()

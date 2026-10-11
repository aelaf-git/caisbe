"""Serve local uploads, and require a signed-in session for student files.

Public marketing files (covers, news, heroes) stay readable without a session.
Student work, membership files, and course media require a valid bearer token
or session cookie. The token is checked for a signature only; the object name
is an unguessable id.
"""

from __future__ import annotations

from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from jose import JWTError, jwt

from app.config import settings

PRIVATE_UPLOAD_PREFIXES = (
    "assignments/",
    "profile/",
    "membership/",
    "courses/assignments/",
    "courses/readings/",
    "courses/media/",
)

SESSION_COOKIES = ("caisbe_portal_session", "caisbe_admin_session")


def _header_map(scope: dict) -> dict[str, str]:
    found: dict[str, str] = {}
    for key, value in scope.get("headers") or []:
        found[key.decode("latin-1").lower()] = value.decode("latin-1")
    return found


def _cookie_value(cookie_header: str, name: str) -> str | None:
    prefix = f"{name}="
    for part in cookie_header.split(";"):
        item = part.strip()
        if item.startswith(prefix):
            return item[len(prefix) :]
    return None


def _token_from_scope(scope: dict) -> str | None:
    headers = _header_map(scope)
    authorization = headers.get("authorization", "")
    if authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
        if token:
            return token
    cookie_header = headers.get("cookie", "")
    for name in SESSION_COOKIES:
        value = _cookie_value(cookie_header, name)
        if value:
            return value
    return None


def _token_is_signed(token: str) -> bool:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except JWTError:
        return False
    subject = payload.get("sub")
    return isinstance(subject, str) and bool(subject)


def _is_private(path: str) -> bool:
    relative = path.lstrip("/")
    if relative.startswith("api/uploads/"):
        relative = relative[len("api/uploads/") :]
    haystack = f"/{relative}"
    return any(haystack.startswith(f"/{prefix}") or f"/{prefix}" in haystack for prefix in PRIVATE_UPLOAD_PREFIXES)


class GuardedUploads(StaticFiles):
    async def __call__(self, scope, receive, send):  # type: ignore[no-untyped-def]
        if scope["type"] == "http" and _is_private(scope.get("path", "")):
            token = _token_from_scope(scope)
            if token is None or not _token_is_signed(token):
                response = JSONResponse({"detail": "Not authenticated"}, status_code=401)
                await response(scope, receive, send)
                return
        await super().__call__(scope, receive, send)

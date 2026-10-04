"""Resolve the real client IP behind Cloudflare / Next.js proxies."""

from __future__ import annotations

from fastapi import Request


def get_client_ip(request: Request) -> str:
    for header in ("cf-connecting-ip", "true-client-ip", "x-real-ip"):
        value = (request.headers.get(header) or "").strip()
        if value:
            return value[:64]
    forwarded = (request.headers.get("x-forwarded-for") or "").strip()
    if forwarded:
        return forwarded.split(",")[0].strip()[:64]
    if request.client and request.client.host:
        return request.client.host[:64]
    return "unknown"

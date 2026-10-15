"""Security headers and anti-scraper shield for API responses."""

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.config import settings

BLOCKED_SCRAPER_UA_SUBSTRINGS = (
    "scrapy",
    "gptbot",
    "chatgpt-user",
    "oai-searchbot",
    "ccbot",
    "claudebot",
    "claude-web",
    "anthropic-ai",
    "bytespider",
    "google-extended",
    "perplexitybot",
    "diffbot",
    "omgilibot",
    "cohere-ai",
    "meta-externalagent",
    "httrack",
    "webcopier",
    "teleport",
    "sitesucker",
    "sqlmap",
    "nikto",
    "masscan",
    "zgrab",
    "libwww-perl",
    "mechanize",
    "go-http-client",
)


def is_blocked_scraper_ua(user_agent: str | None) -> bool:
    ua = (user_agent or "").strip().lower()
    if not ua:
        return False
    return any(token in ua for token in BLOCKED_SCRAPER_UA_SUBSTRINGS)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        path = request.url.path or ""
        if path != "/api/health" and is_blocked_scraper_ua(request.headers.get("user-agent")):
            return JSONResponse(
                {"detail": "Automated scraping is not permitted."},
                status_code=403,
                headers={
                    "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet, noai, noimageai",
                },
            )

        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault(
            "Permissions-Policy",
            "camera=(), microphone=(), geolocation=()",
        )
        response.headers.setdefault(
            "X-Robots-Tag",
            "noindex, nofollow, noarchive, nosnippet, noai, noimageai",
        )
        response.headers.setdefault(
            "Content-Security-Policy",
            "default-src 'none'; frame-ancestors 'none'",
        )
        if settings.is_production:
            response.headers.setdefault(
                "Strict-Transport-Security",
                "max-age=31536000; includeSubDomains",
            )
        return response

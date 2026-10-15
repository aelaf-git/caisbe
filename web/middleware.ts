import { NextResponse, type NextRequest } from "next/server";

const LOCALE_COOKIE = "caisbe_lang";

const BLOCKED_BOT_TOKENS = [
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
  "sitesucker",
  "sqlmap",
  "nikto",
  "masscan",
  "zgrab",
];

function isScraperBot(userAgent: string | null): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return BLOCKED_BOT_TOKENS.some((token) => ua.includes(token));
}

export function middleware(request: NextRequest) {
  if (isScraperBot(request.headers.get("user-agent"))) {
    return new NextResponse("Automated scraping is not permitted.", {
      status: 403,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet, noai, noimageai",
      },
    });
  }

  // `?lang=fr|en` (used by hreflang links) selects the language for this response and
  // remembers it, without redirecting so crawlers can index each language URL.
  const requested = request.nextUrl.searchParams.get("lang");
  const lang = requested === "fr" || requested === "en" ? requested : null;
  let response: NextResponse;
  if (lang) {
    const headers = new Headers(request.headers);
    const others = (request.headers.get("cookie") ?? "")
      .split(";")
      .map((part) => part.trim())
      .filter((part) => part && !part.startsWith(`${LOCALE_COOKIE}=`));
    headers.set("cookie", [...others, `${LOCALE_COOKIE}=${lang}`].join("; "));
    response = NextResponse.next({ request: { headers } });
    response.cookies.set(LOCALE_COOKIE, lang, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  } else {
    response = NextResponse.next();
  }
  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith("/professional-development")) {
    response.headers.set("X-Robots-Tag", "noarchive, nosnippet, noai, noimageai");
  } else {
    response.headers.set("X-Robots-Tag", "noai, noimageai");
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images/).*)"],
};

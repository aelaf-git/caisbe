import { NextResponse, type NextRequest } from "next/server";

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

  const response = NextResponse.next();
  response.headers.set(
    "X-Robots-Tag",
    "noindex, nofollow, noarchive, nosnippet, noai, noimageai",
  );
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images/).*)"],
};

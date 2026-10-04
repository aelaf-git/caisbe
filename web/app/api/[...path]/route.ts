import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const RENDER_API_PUBLIC = "https://caisbe-api.onrender.com";
/**
 * Render private network (bypasses Cloudflare).
 * Port 10000 always routes to the web service's primary HTTP server.
 * Also try 8000 in case PORT is pinned there.
 */
const RENDER_API_PRIVATE_CANDIDATES = [
  "http://caisbe-api:10000",
  "http://caisbe-api:8000",
] as const;

function configuredApiBase(): string {
  // Bracket access keeps this a runtime env read (Next can inline process.env.API_URL at build).
  let raw = (process.env["API_URL"] || "http://127.0.0.1:8000").trim().replace(/\/$/, "");
  // Public Cloudflare / onrender hostnames fail with Error 1000 from Render → Render.
  if (/api\.caisbe\.org/i.test(raw) || /caisbe-api\.onrender\.com/i.test(raw)) {
    raw = RENDER_API_PRIVATE_CANDIDATES[0];
  }
  if (!/^https?:\/\//i.test(raw)) {
    return "http://127.0.0.1:8000";
  }
  return raw;
}

function candidateBases(): string[] {
  const configured = configuredApiBase();
  const bases = [...RENDER_API_PRIVATE_CANDIDATES, configured, RENDER_API_PUBLIC];
  return [...new Set(bases)];
}

const FORWARD_REQUEST_HEADERS = [
  "content-type",
  "authorization",
  "accept",
  "range",
  // Intentionally NOT forwarding browser user-agent — Cloudflare may Error 1000
  // when a datacenter IP presents a browser UA to api/onrender hostnames.
  "accept-language",
  "x-forwarded-for",
  "x-real-ip",
  "cf-connecting-ip",
  "true-client-ip",
  "cf-ipcountry",
  "cf-ipcity",
  "x-vercel-ip-country",
  "x-vercel-ip-city",
  "cloudfront-viewer-country",
  "x-country-code",
] as const;

const FORWARD_RESPONSE_HEADERS = [
  "content-type",
  "content-length",
  "content-range",
  "accept-ranges",
  "cache-control",
  "etag",
  "last-modified",
] as const;

type AttemptLog = {
  base: string;
  status: number | null;
  contentType: string | null;
  okJson: boolean;
  error?: string;
  preview?: string;
};

function clientIp(request: NextRequest): string | null {
  for (const key of ["cf-connecting-ip", "true-client-ip", "x-real-ip"] as const) {
    const value = request.headers.get(key)?.trim();
    if (value) return value;
  }
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || null;
}

function isUnusableUpstream(status: number, contentType: string, preview: string): boolean {
  const type = contentType.toLowerCase();
  if (type.includes("text/html")) return true;
  if (status === 403 && /error 1000|prohibited ip/i.test(preview)) return true;
  if (/dns points to prohibited ip/i.test(preview)) return true;
  return false;
}

function looksLikeJson(contentType: string, preview: string): boolean {
  const type = contentType.toLowerCase();
  if (type.includes("application/json") || type.includes("application/problem+json")) return true;
  const trimmed = preview.trimStart();
  return trimmed.startsWith("{") || trimmed.startsWith("[");
}

async function debugLog(payload: Record<string, unknown>) {
  // #region agent log
  fetch("http://127.0.0.1:7888/ingest/5f144341-267a-42f3-bd43-77522fc291b2", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "a72485" },
    body: JSON.stringify({
      sessionId: "a72485",
      timestamp: Date.now(),
      ...payload,
    }),
  }).catch(() => {});
  // #endregion
}

async function proxy(request: NextRequest, path: string[]): Promise<NextResponse> {
  const targetPath = `/api/${path.join("/")}${request.nextUrl.search}`;
  const headers = new Headers();
  for (const key of FORWARD_REQUEST_HEADERS) {
    const value = request.headers.get(key);
    if (value) headers.set(key, value);
  }
  // Prefer JSON from the API; avoid negotiated HTML error pages.
  if (!headers.has("accept")) {
    headers.set("accept", "application/json");
  }
  headers.set("user-agent", "caisbe-web-proxy/1.0");

  const ip = clientIp(request);
  if (ip) {
    headers.set("x-forwarded-for", ip);
    headers.set("x-real-ip", ip);
  }

  const method = request.method.toUpperCase();
  const contentType = (request.headers.get("content-type") || "").toLowerCase();
  const isMultipart = contentType.includes("multipart/form-data");
  const init: RequestInit & { duplex?: "half" } = {
    method,
    headers,
    redirect: "manual",
    cache: "no-store",
  };

  let bodyBuffer: ArrayBuffer | null = null;
  if (method !== "GET" && method !== "HEAD") {
    if (isMultipart) {
      init.body = request.body;
      init.duplex = "half";
    } else {
      bodyBuffer = await request.arrayBuffer();
      init.body = bodyBuffer;
    }
  }

  const attempts: AttemptLog[] = [];
  let chosen: { base: string; upstream: Response; body: ArrayBuffer; contentType: string } | null =
    null;

  for (const base of candidateBases()) {
    // Multipart streams can only be consumed once — only try first base for uploads.
    if (isMultipart && attempts.length > 0) break;
    if (bodyBuffer) {
      init.body = bodyBuffer;
    }
    const url = `${base}${targetPath}`;
    try {
      const upstream = await fetch(url, init);
      const upstreamType = (upstream.headers.get("content-type") || "").toLowerCase();
      const streamResponse =
        path[0] === "uploads" ||
        upstreamType.startsWith("video/") ||
        upstreamType.startsWith("audio/") ||
        upstreamType.startsWith("application/octet-stream") ||
        upstreamType.startsWith("application/pdf");

      if (streamResponse) {
        // #region agent log
        void debugLog({
          location: "web/app/api/[...path]/route.ts:stream",
          message: "stream upstream chosen",
          hypothesisId: "A",
          data: { base, status: upstream.status, upstreamType, path: targetPath },
        });
        // #endregion
        const responseHeaders = new Headers();
        for (const key of FORWARD_RESPONSE_HEADERS) {
          const value = upstream.headers.get(key);
          if (value) responseHeaders.set(key, value);
        }
        return new NextResponse(upstream.body, {
          status: upstream.status,
          headers: responseHeaders,
        });
      }

      const body = await upstream.arrayBuffer();
      const preview = new TextDecoder().decode(body.slice(0, 240));
      const unusable = isUnusableUpstream(upstream.status, upstreamType, preview);
      const okJson = !unusable && looksLikeJson(upstreamType, preview);
      attempts.push({
        base,
        status: upstream.status,
        contentType: upstreamType || null,
        okJson,
        preview: preview.replace(/\s+/g, " ").slice(0, 160),
      });

      if (okJson && !chosen) {
        chosen = { base, upstream, body, contentType: upstreamType };
        break;
      }
    } catch (error) {
      attempts.push({
        base,
        status: null,
        contentType: null,
        okJson: false,
        error: error instanceof Error ? error.message : "fetch failed",
      });
    }
  }

  // #region agent log
  void debugLog({
    location: "web/app/api/[...path]/route.ts:proxy",
    message: "web proxy attempts",
    hypothesisId: "A,B,C,D,E",
    data: {
      path: targetPath,
      configured: configuredApiBase(),
      chosenBase: chosen?.base ?? null,
      attempts,
    },
  });
  // #endregion

  if (!chosen) {
    return NextResponse.json(
      {
        detail: "Unable to reach the API. Please try again shortly.",
        debug: {
          service: "web",
          configured: configuredApiBase(),
          attempts,
        },
      },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers();
  for (const key of FORWARD_RESPONSE_HEADERS) {
    const value = chosen.upstream.headers.get(key);
    if (value) responseHeaders.set(key, value);
  }
  responseHeaders.delete("content-length");
  if (chosen.body.byteLength > 0) {
    responseHeaders.set("content-length", String(chosen.body.byteLength));
  }
  responseHeaders.set("x-caisbe-api-base", chosen.base);
  return new NextResponse(chosen.body, {
    status: chosen.upstream.status,
    headers: responseHeaders,
  });
}

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, context: RouteContext) {
  return proxy(request, (await context.params).path);
}

export async function HEAD(request: NextRequest, context: RouteContext) {
  return proxy(request, (await context.params).path);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxy(request, (await context.params).path);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return proxy(request, (await context.params).path);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return proxy(request, (await context.params).path);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return proxy(request, (await context.params).path);
}

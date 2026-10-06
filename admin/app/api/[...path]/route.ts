import { NextRequest, NextResponse } from "next/server";
import {
  UPSTREAM_COLD_START_RETRIES,
  UPSTREAM_FETCH_TIMEOUT_MS,
  UPSTREAM_RETRY_DELAY_MS,
  candidateApiBases,
  sleep,
} from "@/lib/apiUpstream";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const FORWARD_REQUEST_HEADERS = [
  "content-type",
  "authorization",
  "accept",
  "range",
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

/**
 * Accept any real API response that is not Cloudflare/HTML.
 * Connection failures alone should produce the generic 502 — not API 4xx/5xx bodies.
 */
function isAcceptableUpstream(
  status: number,
  contentType: string,
  preview: string,
  bodyByteLength: number,
): boolean {
  if (isUnusableUpstream(status, contentType, preview)) return false;
  if (status >= 200 && status < 300 && (status === 204 || status === 205 || bodyByteLength === 0)) {
    return true;
  }
  if (looksLikeJson(contentType, preview)) return true;
  // Forward plain-text FastAPI/uvicorn errors instead of masking as unreachable.
  if (status >= 400 && !contentType.includes("text/html")) return true;
  return false;
}

async function fetchUpstream(
  url: string,
  init: RequestInit & { duplex?: "half" },
): Promise<Response> {
  const signal =
    typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
      ? AbortSignal.timeout(UPSTREAM_FETCH_TIMEOUT_MS)
      : undefined;
  return fetch(url, { ...init, signal });
}

async function proxy(request: NextRequest, path: string[]): Promise<NextResponse> {
  const targetPath = `/api/${path.join("/")}${request.nextUrl.search}`;
  const headers = new Headers();
  for (const key of FORWARD_REQUEST_HEADERS) {
    const value = request.headers.get(key);
    if (value) headers.set(key, value);
  }
  if (!headers.has("accept")) {
    headers.set("accept", "application/json");
  }
  headers.set("user-agent", "caisbe-admin-proxy/1.0");

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

  let chosen: { upstream: Response; body: ArrayBuffer } | null = null;
  let tried = 0;
  const bases = candidateApiBases();
  const failures: string[] = [];

  for (const base of bases) {
    if (isMultipart && tried > 0) break;
    tried += 1;

    const attempts = isMultipart ? 1 : UPSTREAM_COLD_START_RETRIES + 1;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      if (bodyBuffer) init.body = bodyBuffer;
      try {
        const upstream = await fetchUpstream(`${base}${targetPath}`, init);
        const upstreamType = (upstream.headers.get("content-type") || "").toLowerCase();
        const streamResponse =
          path[0] === "uploads" ||
          upstreamType.startsWith("video/") ||
          upstreamType.startsWith("audio/") ||
          upstreamType.startsWith("application/octet-stream") ||
          upstreamType.startsWith("application/pdf");

        if (streamResponse) {
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
        if (isAcceptableUpstream(upstream.status, upstreamType, preview, body.byteLength)) {
          chosen = { upstream, body };
          break;
        }
        failures.push(`${base} → HTTP ${upstream.status} unusable`);
        break;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "fetch failed";
        failures.push(`${base} attempt ${attempt + 1}: ${msg}`);
        if (attempt + 1 < attempts) {
          await sleep(UPSTREAM_RETRY_DELAY_MS * (attempt + 1));
        }
      }
    }
    if (chosen) break;
  }

  if (!chosen) {
    console.error("[caisbe-admin-proxy] upstream unreachable", { targetPath, bases, failures });
    return NextResponse.json(
      { detail: "Unable to reach the API. Please try again shortly." },
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

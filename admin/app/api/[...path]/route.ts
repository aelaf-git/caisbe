import { NextRequest, NextResponse } from "next/server";
import { candidateApiBases } from "@/lib/apiUpstream";

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

  for (const base of candidateApiBases()) {
    if (isMultipart && tried > 0) break;
    tried += 1;
    if (bodyBuffer) init.body = bodyBuffer;

    try {
      const upstream = await fetch(`${base}${targetPath}`, init);
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
      if (
        !isUnusableUpstream(upstream.status, upstreamType, preview) &&
        looksLikeJson(upstreamType, preview)
      ) {
        chosen = { upstream, body };
        break;
      }
    } catch {
      // Try the next candidate base.
    }
  }

  if (!chosen) {
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

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const RENDER_API = "https://caisbe-api.onrender.com";

function apiBase(): string {
  // Bracket access keeps this a runtime env read (Next can inline process.env.API_URL at build).
  let raw = (process.env["API_URL"] || "http://127.0.0.1:8000").trim().replace(/\/$/, "");
  // Browsers can call api.caisbe.org. Render → Cloudflare custom domain returns Error 1000.
  if (/api\.caisbe\.org/i.test(raw)) {
    raw = RENDER_API;
  }
  if (!/^https?:\/\//i.test(raw)) {
    return "http://127.0.0.1:8000";
  }
  return raw;
}

const FORWARD_REQUEST_HEADERS = [
  "content-type",
  "authorization",
  "accept",
  "range",
  "user-agent",
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

async function proxy(request: NextRequest, path: string[]): Promise<NextResponse> {
  const base = apiBase();
  const targetPath = `/api/${path.join("/")}${request.nextUrl.search}`;
  const headers = new Headers();
  for (const key of FORWARD_REQUEST_HEADERS) {
    const value = request.headers.get(key);
    if (value) headers.set(key, value);
  }
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

  if (method !== "GET" && method !== "HEAD") {
    if (isMultipart) {
      init.body = request.body;
      init.duplex = "half";
    } else {
      init.body = await request.arrayBuffer();
    }
  }

  async function upstreamFetch(url: string): Promise<Response | null> {
    try {
      return await fetch(url, init);
    } catch {
      return null;
    }
  }

  let upstream = await upstreamFetch(`${base}${targetPath}`);
  if (
    upstream &&
    (upstream.headers.get("content-type") || "").toLowerCase().includes("text/html") &&
    base !== RENDER_API
  ) {
    upstream = await upstreamFetch(`${RENDER_API}${targetPath}`);
  }
  if (!upstream && base !== RENDER_API) {
    upstream = await upstreamFetch(`${RENDER_API}${targetPath}`);
  }
  if (!upstream) {
    return NextResponse.json(
      { detail: "Unable to reach the API. Please try again shortly." },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers();
  for (const key of FORWARD_RESPONSE_HEADERS) {
    const value = upstream.headers.get(key);
    if (value) responseHeaders.set(key, value);
  }

  const upstreamType = (upstream.headers.get("content-type") || "").toLowerCase();
  const streamResponse =
    path[0] === "uploads" ||
    upstreamType.startsWith("video/") ||
    upstreamType.startsWith("audio/") ||
    upstreamType.startsWith("application/octet-stream") ||
    upstreamType.startsWith("application/pdf");

  if (streamResponse) {
    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  }

  const body = await upstream.arrayBuffer();
  if (upstreamType.includes("text/html")) {
    return NextResponse.json(
      { detail: "Unable to reach the API. Please try again shortly." },
      { status: 502 },
    );
  }
  responseHeaders.delete("content-length");
  if (body.byteLength > 0) {
    responseHeaders.set("content-length", String(body.byteLength));
  }
  return new NextResponse(body, {
    status: upstream.status,
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

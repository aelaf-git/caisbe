import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function apiBase(): string {
  // Use || so empty string from a bad Docker ARG does not produce relative fetch URLs.
  const raw = (process.env.API_URL || "http://127.0.0.1:8000").trim().replace(/\/$/, "");
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

async function proxy(request: NextRequest, path: string[]): Promise<NextResponse> {
  const target = `${apiBase()}/api/${path.join("/")}${request.nextUrl.search}`;
  const headers = new Headers();
  for (const key of FORWARD_REQUEST_HEADERS) {
    const value = request.headers.get(key);
    if (value) headers.set(key, value);
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

  let upstream: Response;
  try {
    upstream = await fetch(target, init);
  } catch {
    return NextResponse.json(
      { detail: "Unable to reach the API. Check API_URL on the web service." },
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

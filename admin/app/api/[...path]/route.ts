import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function apiBase(): string {
  return (process.env.API_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");
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
  const init: RequestInit & { duplex?: "half" } = {
    method,
    headers,
    redirect: "manual",
    cache: "no-store",
  };
  if (method !== "GET" && method !== "HEAD") {
    // Stream the body so large uploads do not buffer in Next.
    init.body = request.body;
    init.duplex = "half";
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, init);
  } catch {
    return NextResponse.json(
      { detail: "Unable to reach the API. Check API_URL on the admin service." },
      { status: 502 },
    );
  }

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

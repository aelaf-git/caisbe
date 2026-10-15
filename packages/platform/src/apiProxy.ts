import { NextRequest, NextResponse } from "next/server";

import {
  UPSTREAM_COLD_START_RETRIES,
  UPSTREAM_FETCH_TIMEOUT_MS,
  UPSTREAM_RETRY_DELAY_MS,
  candidateApiBases,
  sleep,
} from "./apiUpstream";

const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

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

export type ApiProxyOptions = {
  userAgent: string;
  /** HttpOnly cookie that holds the bearer token. Page scripts cannot read it. */
  sessionCookie: string;
  /** Older JS-readable cookie, copied into the HttpOnly cookie and then cleared. */
  legacyCookie?: string;
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
  if (status >= 400 && !contentType.includes("text/html")) return true;
  return false;
}

function isSecure(request: NextRequest): boolean {
  const forwarded = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (forwarded) return forwarded === "https";
  return request.nextUrl.protocol === "https:";
}

function cookieDomain(request: NextRequest): string | undefined {
  const host = request.nextUrl.hostname;
  if (host === "caisbe.org" || host.endsWith(".caisbe.org")) return ".caisbe.org";
  return undefined;
}

function bearerFrom(request: NextRequest): string | null {
  const header = request.headers.get("authorization");
  if (header && /^bearer\s+\S+/i.test(header)) return header.replace(/^bearer\s+/i, "").trim();
  return null;
}

function applySession(
  response: NextResponse,
  request: NextRequest,
  options: ApiProxyOptions,
  token: string | null,
) {
  const domain = cookieDomain(request);
  const secure = isSecure(request);
  if (token) {
    response.cookies.set({
      name: options.sessionCookie,
      value: token,
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
      ...(domain ? { domain } : {}),
    });
  }
  if (options.legacyCookie) {
    response.cookies.set({
      name: options.legacyCookie,
      value: "",
      httpOnly: false,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
      ...(domain ? { domain } : {}),
    });
  }
}

function clearSession(response: NextResponse, request: NextRequest, options: ApiProxyOptions) {
  const domain = cookieDomain(request);
  const secure = isSecure(request);
  for (const name of [options.sessionCookie, options.legacyCookie].filter(Boolean) as string[]) {
    response.cookies.set({
      name,
      value: "",
      httpOnly: name === options.sessionCookie,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
      ...(domain ? { domain } : {}),
    });
  }
}

/** Remove the bearer token from a JSON body so the page cannot store it. */
function stripAccessToken(body: ArrayBuffer): { body: ArrayBuffer; token: string | null } {
  try {
    const text = new TextDecoder().decode(body);
    const data = JSON.parse(text) as { access_token?: unknown };
    if (typeof data.access_token !== "string" || !data.access_token) {
      return { body, token: null };
    }
    const token = data.access_token;
    delete data.access_token;
    const bytes = new TextEncoder().encode(JSON.stringify(data));
    const encoded = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    return { body: encoded, token };
  } catch {
    return { body, token: null };
  }
}

async function fetchUpstream(url: string, init: RequestInit & { duplex?: "half" }): Promise<Response> {
  const signal =
    typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
      ? AbortSignal.timeout(UPSTREAM_FETCH_TIMEOUT_MS)
      : undefined;
  return fetch(url, { ...init, signal });
}

async function proxy(request: NextRequest, path: string[], options: ApiProxyOptions): Promise<NextResponse> {
  const method = request.method.toUpperCase();
  if (method === "POST" && path.join("/") === "auth/logout") {
    const response = NextResponse.json({ ok: true });
    clearSession(response, request, options);
    return response;
  }

  const targetPath = `/api/${path.join("/")}${request.nextUrl.search}`;
  const headers = new Headers();
  for (const key of FORWARD_REQUEST_HEADERS) {
    const value = request.headers.get(key);
    if (value) headers.set(key, value);
  }
  if (!headers.has("accept")) headers.set("accept", "application/json");
  headers.set("user-agent", options.userAgent);

  const sessionToken = request.cookies.get(options.sessionCookie)?.value || null;
  const legacyToken = options.legacyCookie ? request.cookies.get(options.legacyCookie)?.value || null : null;
  const headerToken = bearerFrom(request);
  if (!headers.has("authorization")) {
    const token = sessionToken || legacyToken;
    if (token) headers.set("authorization", `Bearer ${token}`);
  }

  const ip = clientIp(request);
  if (ip) {
    headers.set("x-forwarded-for", ip);
    headers.set("x-real-ip", ip);
  }

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
      // Avoid sending an empty body on DELETE/etc. Some upstreams/CDNs reject
      // DELETE with Content-Length: 0 even when the body is unused.
      if (bodyBuffer.byteLength > 0) {
        init.body = bodyBuffer;
      } else {
        bodyBuffer = null;
      }
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
          const response = new NextResponse(upstream.body, {
            status: upstream.status,
            headers: responseHeaders,
          });
          if (upstream.status >= 200 && upstream.status < 300 && !sessionToken && (headerToken || legacyToken)) {
            applySession(response, request, options, headerToken || legacyToken);
          }
          return response;
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
        if (attempt + 1 < attempts) await sleep(UPSTREAM_RETRY_DELAY_MS * (attempt + 1));
      }
    }
    if (chosen) break;
  }

  if (!chosen) {
    console.error(`[${options.userAgent}] upstream unreachable`, { targetPath, bases, failures });
    return NextResponse.json({ detail: "Unable to reach the API. Please try again shortly." }, { status: 502 });
  }

  let responseBody = chosen.body;
  let issuedToken: string | null = null;
  if (chosen.upstream.status >= 200 && chosen.upstream.status < 300) {
    const stripped = stripAccessToken(responseBody);
    responseBody = stripped.body;
    issuedToken = stripped.token;
    if (!issuedToken && !sessionToken && (headerToken || legacyToken)) {
      issuedToken = headerToken || legacyToken;
    }
  }

  const responseHeaders = new Headers();
  for (const key of FORWARD_RESPONSE_HEADERS) {
    const value = chosen.upstream.headers.get(key);
    if (value) responseHeaders.set(key, value);
  }
  responseHeaders.delete("content-length");
  if (responseBody.byteLength > 0) {
    responseHeaders.set("content-length", String(responseBody.byteLength));
  }
  const response = new NextResponse(responseBody, {
    status: chosen.upstream.status,
    headers: responseHeaders,
  });
  if (issuedToken) applySession(response, request, options, issuedToken);
  return response;
}

type RouteContext = { params: Promise<{ path: string[] }> };

export function createApiHandlers(options: ApiProxyOptions) {
  return {
    GET: async (request: NextRequest, context: RouteContext) =>
      proxy(request, (await context.params).path, options),
    HEAD: async (request: NextRequest, context: RouteContext) =>
      proxy(request, (await context.params).path, options),
    POST: async (request: NextRequest, context: RouteContext) =>
      proxy(request, (await context.params).path, options),
    PUT: async (request: NextRequest, context: RouteContext) =>
      proxy(request, (await context.params).path, options),
    PATCH: async (request: NextRequest, context: RouteContext) =>
      proxy(request, (await context.params).path, options),
    DELETE: async (request: NextRequest, context: RouteContext) =>
      proxy(request, (await context.params).path, options),
  };
}

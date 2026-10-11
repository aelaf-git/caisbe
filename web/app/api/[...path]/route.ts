import { createApiHandlers } from "@caisbe/platform/apiProxy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const handlers = createApiHandlers({
  userAgent: "caisbe-web-proxy/1.0",
  sessionCookie: "caisbe_portal_session",
  legacyCookie: "caisbe_portal_access_token",
});

export const GET = handlers.GET;
export const HEAD = handlers.HEAD;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;

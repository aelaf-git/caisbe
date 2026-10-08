import type { NextConfig } from "next";
import path from "path";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: "base-uri 'self'; object-src 'none'; frame-ancestors 'none'; script-src 'self' 'unsafe-inline'",
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  // Monorepo: trace files from the repo root so standalone includes hoisted deps.
  outputFileTracingRoot: path.join(__dirname, ".."),
  turbopack: {
    root: path.join(__dirname, ".."),
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  experimental: {
    // Large chapter uploads (videos) pass through the App Router API proxy.
    proxyClientMaxBodySize: "500mb",
    serverActions: {
      bodySizeLimit: "500mb",
    },
  },
  // API proxy is handled at runtime by app/api/[...path]/route.ts (reads API_URL on Render).
};

export default nextConfig;

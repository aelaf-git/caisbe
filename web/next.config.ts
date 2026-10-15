import type { NextConfig } from "next";
import path from "path";

// Webpack dev builds use eval-based source maps and React Refresh, which need 'unsafe-eval'.
const scriptSrc =
  process.env.NODE_ENV === "development"
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: `base-uri 'self'; object-src 'none'; frame-ancestors 'none'; ${scriptSrc}`,
  },
];

const nextConfig: NextConfig = {
  transpilePackages: ["@caisbe/platform"],
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, ".."),
  // API calls go through app/api/[...path] so API_URL is read at runtime
  // (Render staging URLs differ from the Blueprint placeholders).
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    return [
      {
        source: "/resources/members-corner",
        destination: "/resources/media",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

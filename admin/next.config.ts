import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  // Monorepo: trace files from the repo root so standalone includes hoisted deps.
  outputFileTracingRoot: path.join(__dirname, ".."),
  turbopack: {
    root: path.join(__dirname, ".."),
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

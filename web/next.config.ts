import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, ".."),
  // API calls go through app/api/[...path] so API_URL is read at runtime
  // (Render staging URLs differ from the Blueprint placeholders).
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

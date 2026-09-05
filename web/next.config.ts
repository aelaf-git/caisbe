import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // API calls go through app/api/[...path] so API_URL is read at runtime
  // (Render staging URLs differ from the Blueprint placeholders).
};

export default nextConfig;

import type { NextConfig } from "next";

const djangoApiUrl =
  process.env.DJANGO_API_URL ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${djangoApiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;

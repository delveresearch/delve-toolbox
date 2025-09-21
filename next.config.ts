// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "ALLOW-FROM https://www.delve-research.com" },
          { key: "Content-Security-Policy", value: "frame-ancestors https://www.delve-research.com;" },
        ],
      },
    ];
  },
};
export default nextConfig;
import { SpeedInsights } from "@vercel/speed-insights/next"
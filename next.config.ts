import type { NextConfig } from "next";

const publicHost = process.env.PUBLIC_URL ? new URL(process.env.PUBLIC_URL).host : undefined;

const nextConfig: NextConfig = {
  output: "standalone",
  devIndicators: false,
  poweredByHeader: false,
  async redirects() {
    return [
      { source: "/schedule", destination: "/matches", permanent: true },
      { source: "/schedule/:path*", destination: "/matches", permanent: true },
      { source: "/matches/bracket", destination: "/matches", permanent: true },
    ];
  },
  experimental: { serverActions: { allowedOrigins: publicHost ? [publicHost] : [] } },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;

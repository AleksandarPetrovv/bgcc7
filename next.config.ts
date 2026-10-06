import type { NextConfig } from "next";

const publicHost = process.env.PUBLIC_URL ? new URL(process.env.PUBLIC_URL).host : undefined;
const dev = process.env.NODE_ENV !== "production";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self'${dev ? " ws: wss:" : ""}`,
  "frame-src https://player.twitch.tv",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://osu.ppy.sh",
  ...(dev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["bancho.js"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "a.ppy.sh" },
      { protocol: "https", hostname: "assets.ppy.sh" },
      { protocol: "https", hostname: "**.s-ul.eu" },
    ],
    imageSizes: [64, 128, 256, 384],
    minimumCacheTTL: 86400,
  },
  devIndicators: false,
  poweredByHeader: false,
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
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;

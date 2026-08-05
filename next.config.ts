import type { NextConfig } from "next";

const publicHost = process.env.PUBLIC_URL ? new URL(process.env.PUBLIC_URL).host : undefined;

const nextConfig: NextConfig = {
  output: "standalone",
  devIndicators: false,
  experimental: {
    serverActions: { allowedOrigins: publicHost ? [publicHost] : [] },
  },
};

export default nextConfig;

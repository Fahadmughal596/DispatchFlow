import type { NextConfig } from "next";

const protectedHeaders = [
  {
    key: "Cache-Control",
    value: "private, no-store, no-cache, must-revalidate, max-age=0"
  },
  { key: "Pragma", value: "no-cache" },
  { key: "Expires", value: "0" }
];

const nextConfig: NextConfig = {
  experimental: {
    cpus: 1,
    serverActions: {
      bodySizeLimit: "12mb"
    }
  },
  async headers() {
    return [
      { source: "/portal/:path*", headers: protectedHeaders },
      { source: "/consultant/:path*", headers: protectedHeaders },
      { source: "/super-admin/:path*", headers: protectedHeaders }
    ];
  }
};

export default nextConfig;

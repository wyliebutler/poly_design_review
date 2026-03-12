import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  transpilePackages: ["three"],
  serverActions: {
    bodySizeLimit: "50mb",
    allowedOrigins: ["polytest.work", "*.polytest.work", "localhost:3000", "192.168.2.200", "192.168.2.200:3000"],
  },
  async headers() {
    return [
      {
        source: "/uploads/:path*",
        headers: [
          {
            key: "Content-Disposition",
            value: "inline",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

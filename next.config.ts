import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  async rewrites() {
    const adminPath = process.env.SECRET_ADMIN_PATH || "admin";
    return [
      {
        source: `/${adminPath}`,
        destination: "/admin",
      },
      {
        source: `/${adminPath}/:path*`,
        destination: "/admin/:path*",
      },
    ];
  },
};

export default nextConfig;
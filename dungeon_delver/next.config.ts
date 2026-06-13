import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
  allowedDevOrigins: ['192.168.110.163'],
};

export default nextConfig;

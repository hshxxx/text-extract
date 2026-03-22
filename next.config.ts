import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: false,
  experimental: {
    devtoolSegmentExplorer: false,
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the LAN address used to open this local dev server.
  allowedDevOrigins: ["192.168.56.1"],
  experimental: {
    serverActions: {
      // QR images are capped at 5 MB; leave room for multipart form overhead.
      bodySizeLimit: "6mb",
    },
  },
  // Supabase reads must be rendered per request. The current App Router model
  // handles this without caching authenticated data across customers.
  cacheComponents: false,
};

export default nextConfig;

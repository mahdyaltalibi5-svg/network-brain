import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Served at summitcustomsuits.com/portal (a rewrite on the website's Vercel project). See lib/base.ts.
  basePath: "/portal",
  experimental: {
    // Pages arrive via summitcustomsuits.com, so server actions see that origin.
    serverActions: { allowedOrigins: ["summitcustomsuits.com", "www.summitcustomsuits.com"], bodySizeLimit: "4.5mb" },
  },
  async redirects() {
    return [{ source: "/", destination: "/portal", basePath: false, permanent: false }];
  },
  // PGlite (the local/dev database) ships WASM and must not be bundled.
  serverExternalPackages: ["@electric-sql/pglite", "web-push"],
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;

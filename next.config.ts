import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Chromium + puppeteer must not be bundled; they are loaded at runtime by the PDF route.
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core", "unpdf"],
  // The compressed Chromium binary is read from disk at runtime, so file tracing can't see it.
  outputFileTracingIncludes: {
    "/api/export/pdf": ["./node_modules/@sparticuz/chromium/bin/**"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;

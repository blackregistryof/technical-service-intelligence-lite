import type { NextConfig } from "next";

// HSTS only for production builds, and only on responses to requests that
// reached the app over HTTPS. Railway terminates TLS at its edge and forwards
// `X-Forwarded-Proto: https`; plain-HTTP requests (localhost `next start`)
// do not match, and `next dev` never gets the header.
const hsts =
  process.env.NODE_ENV === "production"
    ? [
        {
          source: "/:path*",
          has: [{ type: "header" as const, key: "x-forwarded-proto", value: "https" }],
          headers: [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }],
        },
      ]
    : [];

const nextConfig: NextConfig = {
  cacheComponents: true,
  poweredByHeader: false,
  async headers() {
    return [
      ...hsts,
      {
        source: "/:path*",
        headers: [
          // Prevent the login and protected pages from being framed (clickjacking).
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
        ],
      },
    ];
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

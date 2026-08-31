import type { NextConfig } from "next";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // @react-pdf/renderer's `exports` field hides its `browser` build from
    // webpack, so the Node build gets bundled for the client and pdf() throws
    // "Cannot read properties of undefined (reading 'hasOwnProperty')".
    // Force the browser build for the client bundle.
    if (!isServer) {
      // exports blocks "/package.json", so locate the lib dir via the main entry.
      const libDir = path.dirname(require.resolve("@react-pdf/renderer"));
      config.resolve.alias = {
        ...config.resolve.alias,
        "@react-pdf/renderer$": path.join(libDir, "react-pdf.browser.js"),
      };
    }
    return config;
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // Runtime/seed are server assets for this route only, never client imports.
  outputFileTracingIncludes: {
    '/api/v1/results/*/daily-picks': [
      './.private-daily-recommendations/runtime/**/*',
      './scripts/daily-recommendation/*.cjs',
      './src/features/match/server/dailyRecommendation/*.mjs',
      './src/features/match/engine/*.mjs',
      './src/features/match/config/*.mjs',
    ],
  },
  async headers() {
    return [
      {
        source: "/match/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;

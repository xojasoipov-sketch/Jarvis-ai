import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse", "mammoth"],
  },
  // Railway / container: listen on PORT from environment
  // Next.js automatically uses process.env.PORT when running `next start`
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  disableLogger: true,
  // Vercel-specific monitoring disabled — app is Railway-first
  automaticVercelMonitors: false,
});

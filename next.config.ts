import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Next 15+: experimental.serverComponentsExternalPackages → serverExternalPackages
  serverExternalPackages: ["pdf-parse", "mammoth"],
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  disableLogger: true,
  // Railway, not Vercel
  automaticVercelMonitors: false,
});

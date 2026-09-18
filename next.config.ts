import type { NextConfig } from "next";
import { securityHeaders } from "./lib/security/headers";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Local credentials and tooling must never enter traced deployment artifacts.
  outputFileTracingExcludes: {
    "/*": [".codex/**/*", ".agents/**/*", ".git/**/*", ".env*"],
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;

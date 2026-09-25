import type { NextConfig } from "next";
import { securityHeaders } from "./lib/security/headers";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Local credentials and tooling must never enter traced deployment artifacts.
  // Both `dir/**` and `dir/**/*` are listed: some glob matchers only match
  // nested paths with `**/*` and miss direct children like `.codex/config.toml`.
  outputFileTracingExcludes: {
    "/*": [".codex/**", ".codex/**/*", ".agents/**", ".agents/**/*", ".git/**", ".git/**/*", ".env*", ".mcp.json"],
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;

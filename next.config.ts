import type { NextConfig } from "next";
import { securityHeaders } from "./lib/security/headers";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Matches the app's own 11 MiB check in app/api/uploads/images/route.ts: without this, Next's
  // default 10MB cap silently truncates larger multipart bodies mid-stream (corrupting the
  // boundary) before our own validation ever runs, crashing with an unhandled 500 instead of a
  // clean 400.
  experimental: { proxyClientMaxBodySize: "12mb" },
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

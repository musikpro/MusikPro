import type { NextConfig } from "next";
import { securityHeaders, serviceWorkerSecurityHeaders } from "./lib/security/headers";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Matches the app's own 11 MiB check in app/api/uploads/images/route.ts: without this, Next's
  // default 10MB cap silently truncates larger multipart bodies mid-stream (corrupting the
  // boundary) before our own validation ever runs, crashing with an unhandled 500 instead of a
  // clean 400.
  experimental: {
    proxyClientMaxBodySize: "12mb",
    // Server Actions default to a 1 MB body — file-upload admin actions (e.g. app/admin/media,
    // whose <input type="file"> posts straight to a Server Action instead of a Route Handler)
    // need the same ceiling as the API upload route above, or Next rejects the request with an
    // unhandled 500 ("Body exceeded 1 MB limit") before our own code ever runs.
    serverActions: { bodySizeLimit: "12mb" },
  },
  // Local credentials and tooling must never enter traced deployment artifacts.
  // Both `dir/**` and `dir/**/*` are listed: some glob matchers only match
  // nested paths with `**/*` and miss direct children like `.codex/config.toml`.
  outputFileTracingExcludes: {
    "/*": [".codex/**", ".codex/**/*", ".agents/**", ".agents/**/*", ".git/**", ".git/**/*", ".env*", ".mcp.json"],
  },
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      { source: "/sw.js", headers: serviceWorkerSecurityHeaders },
    ];
  },
};

export default nextConfig;

import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";

// proxy.ts imports lib/security/headers.ts (no "server-only"/DB import), so this exercises the
// real buildContentSecurityPolicy function directly rather than a static source guard.
import { buildContentSecurityPolicy } from "@/lib/security/headers";

describe("Content-Security-Policy: nonce-based script-src", () => {
  it("never includes 'unsafe-inline' in script-src", () => {
    const csp = buildContentSecurityPolicy("test-nonce-value");
    const scriptSrc = csp.split("; ").find((directive) => directive.startsWith("script-src"));
    expect(scriptSrc).toBeDefined();
    expect(scriptSrc).not.toContain("unsafe-inline");
    expect(scriptSrc).toContain("'nonce-test-nonce-value'");
  });

  it("keeps 'unsafe-inline' in style-src (nonces don't cover the style=\"\" HTML attribute)", () => {
    const csp = buildContentSecurityPolicy("test-nonce-value");
    const styleSrc = csp.split("; ").find((directive) => directive.startsWith("style-src"));
    expect(styleSrc).toBe("style-src 'self' 'unsafe-inline'");
  });

  it("produces a different policy string for a different nonce (verifies it's actually templated, not cached)", () => {
    const a = buildContentSecurityPolicy("nonce-a");
    const b = buildContentSecurityPolicy("nonce-b");
    expect(a).not.toBe(b);
    expect(a).toContain("'nonce-nonce-a'");
    expect(b).toContain("'nonce-nonce-b'");
  });

  it("still allowlists the Cloudflare Turnstile script host", () => {
    const csp = buildContentSecurityPolicy("test-nonce-value");
    expect(csp).toContain("https://challenges.cloudflare.com");
  });
});

describe("proxy.ts wiring", () => {
  it("sets the nonce and CSP on both the request headers (for Next's own hydration scripts) and the response", async () => {
    const source = await fs.readFile("proxy.ts", "utf8");
    expect(source).toContain('requestHeaders.set("x-nonce", nonce)');
    expect(source).toContain('requestHeaders.set("Content-Security-Policy", csp)');
    expect(source).toContain('response.headers.set("Content-Security-Policy", csp)');
  });

  it("does not skip prefetch requests: the /demo rewrite only exists because this middleware runs on every request to it", async () => {
    const source = await fs.readFile("proxy.ts", "utf8");
    expect(source).not.toContain("next-router-prefetch");
    expect(source).not.toContain('"purpose"');
  });

  it("excludes only static assets from the matcher, not API routes (every response must carry a CSP)", async () => {
    const source = await fs.readFile("proxy.ts", "utf8");
    expect(source).toContain("_next/static|_next/image|favicon.ico");
    expect(source).not.toMatch(/matcher:\s*\[\s*"\(\?!api\|/);
  });
});

describe("Pages that need the nonce are forced dynamic (nonces require per-request rendering)", () => {
  const mustBeDynamic = [
    "app/privacy/page.tsx",
    "app/terms/page.tsx",
    "app/(auth)/reset-password/page.tsx",
    "app/(auth)/two-factor/page.tsx",
    "app/(auth)/forgot-password/page.tsx",
    "app/(auth)/register/page.tsx",
    "app/not-found.tsx",
  ];

  for (const file of mustBeDynamic) {
    it(`${file} forces dynamic rendering`, async () => {
      const source = await fs.readFile(file, "utf8");
      expect(source).toContain('export const dynamic = "force-dynamic"');
    });
  }
});

#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const errors = [];
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(root, rel));
const fail = (message) => errors.push(message);

for (const rel of [
  "lib/security/headers.ts",
  "proxy.ts",
  "app/layout.tsx",
  "components/security/nonce-provider.tsx",
  "components/turnstile-widget.tsx",
])
  if (!exists(rel)) fail(`Missing strict CSP file: ${rel}`);

if (!errors.length) {
  const headers = read("lib/security/headers.ts");
  const proxy = read("proxy.ts");
  const layout = read("app/layout.tsx");
  const turnstile = read("components/turnstile-widget.tsx");
  const pkg = JSON.parse(read("package.json"));

  // script-src is strict (per-request nonce, no unsafe-inline). style-src keeps 'unsafe-inline'
  // on purpose: this app relies on React `style={{}}` attributes, which a CSP nonce cannot cover.
  const scriptSrc = headers.split("\n").find((line) => /^\s*`script-src /.test(line)) ?? "";
  if (!scriptSrc.includes("'nonce-${nonce}'")) fail("script-src must use a per-request nonce");
  if (scriptSrc.includes("'unsafe-inline'")) fail("script-src must not contain unsafe-inline");
  if (!headers.includes("upgrade-insecure-requests")) fail("CSP marker missing: upgrade-insecure-requests");
  if (!headers.includes("serviceWorkerSecurityHeaders")) fail("Service worker needs dedicated security/cache headers");

  for (const marker of [
    "crypto.randomUUID()",
    'requestHeaders.set("x-nonce"',
    'requestHeaders.set("Content-Security-Policy"',
    'response.headers.set("Content-Security-Policy"',
  ]) {
    if (!proxy.includes(marker)) fail(`proxy.ts nonce/CSP wiring missing: ${marker}`);
  }
  if (!layout.includes('get("x-nonce")') || !layout.includes("NonceProvider"))
    fail("Root layout must propagate the CSP nonce to client components");
  if (!turnstile.includes("useCspNonce") || !turnstile.includes("nonce={nonce}"))
    fail("Turnstile script must receive the CSP nonce");

  for (const gate of ["verify:code", "verify:production", "ci:check", "security:release"]) {
    if (!String(pkg.scripts?.[gate] || "").includes("security:csp-check"))
      fail(`${gate} must include security:csp-check`);
  }
}

if (errors.length) {
  console.error(`Strict CSP gate: FAIL (${errors.length})`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(
  "Strict CSP gate: PASS — per-request script nonce, no script unsafe-inline, Turnstile nonce and service-worker headers verified.",
);

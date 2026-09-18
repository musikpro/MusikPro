#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const errors = [];
const warnings = [];
const exists = (rel) => fs.existsSync(path.join(root, rel));
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const fail = (message) => errors.push(message);
const warn = (message) => warnings.push(message);

function walk(relDir) {
  const abs = path.join(root, relDir);
  if (!fs.existsSync(abs)) return [];
  const out = [];
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = path.join(relDir, entry.name).replaceAll("\\", "/");
    if (entry.isDirectory()) out.push(...walk(rel));
    else out.push(rel);
  }
  return out;
}

// 1) Server-side page authorization must live at the layout boundary so future pages inherit it.
const stripComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
const dashboardLayout = read("app/dashboard/layout.tsx");
const dashboardLayoutCode = stripComments(dashboardLayout);
if (!dashboardLayoutCode.includes("requireUser") || !/\bawait\s+requireUser\(\);/.test(dashboardLayoutCode)) {
  fail("app/dashboard/layout.tsx must enforce requireUser() server-side for every dashboard page");
}
const adminLayout = read("app/admin/layout.tsx");
const adminLayoutCode = stripComments(adminLayout);
if (!adminLayoutCode.includes("requireAdmin") || !/\bawait\s+requireAdmin\(\);/.test(adminLayoutCode)) {
  fail("app/admin/layout.tsx must enforce requireAdmin() server-side for every admin page");
}

// 2) Browser responses must never expose raw payment-provider responses.
const checkoutRoute = read("app/api/payments/checkout/route.ts");
if (!checkoutRoute.includes("publicCheckoutResult(result)")) fail("checkout response must pass through publicCheckoutResult");
if (/Response\.json\(\{\s*\.\.\.result\b/.test(checkoutRoute)) fail("checkout route must not spread raw provider result into a browser response");
const publicResult = read("lib/payments/public-result.ts");
if (publicResult.includes("raw: result.raw") || /\braw\b\s*[:,]/.test(publicResult.replace(/\/\*[\s\S]*?\*\//g, ""))) {
  fail("publicCheckoutResult must not expose CheckoutResult.raw");
}

// 3) First-party authenticated mutating endpoints get origin, media-type and body-size guards.
for (const rel of ["app/api/payments/checkout/route.ts", "app/api/uploads/images/route.ts"]) {
  const text = read(rel);
  for (const marker of ["rejectCrossSiteMutation", "rejectOversizedRequest", "requireContentType"]) {
    if (!text.includes(marker)) fail(`${rel}: missing request guard ${marker}`);
  }
}

// 4) Security-sensitive identifiers/tokens must not use Math.random().
for (const rel of [...walk("app"), ...walk("lib"), ...walk("db"), ...walk("scripts")]) {
  if (!/\.(?:ts|tsx|js|mjs|cjs)$/.test(rel)) continue;
  if (rel === "scripts/general-refactor-check.mjs") continue;
  const text = read(rel);
  if (text.includes("Math.random(")) fail(`${rel}: Math.random() is forbidden for kit-generated identifiers/tokens; use node:crypto`);
}

// 5) Production-only HTTPS controls must not break local HTTP development.
const headers = read("lib/security/headers.ts");
if (!headers.includes('...(production ? ["upgrade-insecure-requests"] : [])')) fail("CSP upgrade-insecure-requests must be production-only");
if (!headers.includes('...(production ? [{ key: "Strict-Transport-Security"')) fail("HSTS must be production-only");

// 6) Permanent gates must remain wired into all principal delivery workflows.
const pkg = JSON.parse(read("package.json"));
for (const gate of ["verify:code", "verify:production", "ci:check"]) {
  const script = String(pkg.scripts?.[gate] || "");
  for (const required of ["security:baseline", "validation:zod-check", "refactor:check", "security:versions"]) {
    if (!script.includes(required)) fail(`${gate}: missing permanent gate ${required}`);
  }
}
if (!String(pkg.scripts?.["security:release"] || "").includes("refactor:check")) fail("security:release must include refactor:check");
if (!String(pkg.scripts?.["security:release"] || "").includes("security:versions")) fail("security:release must include security:versions");

// 7) CI must use the canonical gate instead of silently drifting from local checks.
const ci = read(".github/workflows/ci.yml");
if (!ci.includes("npm run ci:check")) fail(".github/workflows/ci.yml must call npm run ci:check as the canonical CI gate");
const guard = read(".github/workflows/security-guard.yml");
if (!guard.includes("npm run security:release")) fail("security-guard workflow must call npm run security:release");

// 8) Basic source hygiene signals.
for (const rel of [...walk("app"), ...walk("lib"), ...walk("components")]) {
  if (!/\.(?:ts|tsx|js|mjs|cjs)$/.test(rel)) continue;
  const text = read(rel);
  if (/\beval\s*\(|new\s+Function\s*\(/.test(text)) fail(`${rel}: dynamic code execution detected`);
  if (/console\.(?:log|info|debug)\([^\n]*(password|secret|token|authorization|cookie)/i.test(text)) fail(`${rel}: possible sensitive logging`);
}

// 9) Lockfile remains a production blocker, but not a static-refactor blocker in source-only workspaces.
if (!exists("package-lock.json")) warn("package-lock.json absent — dependency audit/build reproducibility remains unverified until npm install succeeds");

if (warnings.length) for (const item of warnings) console.warn(`WARNING: ${item}`);
if (errors.length) {
  console.error(`General refactor gate: FAIL (${errors.length})`);
  for (const item of errors) console.error(`- ${item}`);
  process.exit(1);
}
console.log("General refactor gate: PASS — auth boundaries, request guards, payment response hygiene, crypto IDs, headers and CI wiring verified.");

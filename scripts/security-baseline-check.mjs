#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const errors = [];
const warnings = [];
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(root, rel));

function fail(message) {
  errors.push(message);
}
function warn(message) {
  warnings.push(message);
}

// 1) Secrets and .env.local protection.
const gitignore = read(".gitignore")
  .split(/\r?\n/)
  .map((x) => x.trim());
if (!gitignore.includes(".env.local")) fail(".gitignore must explicitly ignore .env.local");
for (const rel of [".env", ".env.local", ".env.production", ".env.development", ".env.test"]) {
  if (!exists(rel)) continue;
  const text = read(rel);
  if (/NEXT_PUBLIC_[A-Z0-9_]*(SECRET|TOKEN|PRIVATE|API_KEY|DATABASE)/i.test(text))
    fail(`${rel}: secret-like variable exposed through NEXT_PUBLIC_*`);
}
const sourceRoots = ["app", "components", "lib", "db", "prisma", "scripts"];
const secretPattern =
  /(sk_live_[A-Za-z0-9_-]{12,}|sk_test_[A-Za-z0-9_-]{12,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|AKIA[0-9A-Z]{16})/;
function walk(dir) {
  if (!exists(dir)) return [];
  const out = [];
  for (const ent of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(rel));
    else if (/\.(?:ts|tsx|js|mjs|cjs|json|md|sql)$/.test(ent.name)) out.push(rel);
  }
  return out;
}
for (const rel of sourceRoots.flatMap(walk)) {
  const text = read(rel);
  if (secretPattern.test(text)) fail(`${rel}: possible hard-coded credential/private key`);
}

// 2) Every API route must remain explicitly classified for auth, validation and rate limiting.
const routeManifest = JSON.parse(read("config/security-routes.json"));
const apiRoutes = walk("app/api")
  .filter((x) => x.endsWith("/route.ts"))
  .sort();
const classified = Object.keys(routeManifest.routes || {}).sort();
for (const rel of apiRoutes)
  if (!routeManifest.routes?.[rel])
    fail(`${rel}: unclassified API route; add auth/validation/rateLimit policy to config/security-routes.json`);
for (const rel of classified)
  if (!apiRoutes.includes(rel)) fail(`${rel}: security route manifest points to a missing route`);
for (const rel of apiRoutes) {
  const policy = routeManifest.routes[rel];
  if (!policy?.auth || !policy?.validation || !policy?.rateLimit)
    fail(`${rel}: auth/validation/rateLimit classification incomplete`);
  const text = read(rel);
  for (const marker of policy?.markers || [])
    if (!text.includes(marker)) fail(`${rel}: expected security marker missing: ${marker}`);
}

// 3) RLS coverage cannot silently drift when new tables are added.
const rls = JSON.parse(read("config/security-rls.json"));
const schemaFiles = walk("db/schema").filter((x) => x.endsWith(".ts"));
const tables = new Set();
for (const rel of schemaFiles) {
  const text = read(rel);
  for (const m of text.matchAll(/pgTable\(\s*["']([^"']+)["']/g)) tables.add(m[1]);
}
// Targeted Prisma modules (for example CRUD Clients) are classified alongside Drizzle tables.
if (exists("prisma/schema.prisma")) {
  const prismaSchema = read("prisma/schema.prisma");
  for (const m of prismaSchema.matchAll(/model\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{([\s\S]*?)\n\}/g)) {
    const model = m[1];
    const body = m[2];
    const mapped = body.match(/@@map\(\s*["']([^"']+)["']\s*\)/)?.[1];
    tables.add(mapped || model);
  }
}
const required = new Set(Object.keys(rls.required || {}));
const conditional = new Set(Object.keys(rls.conditional || {}));
const exempt = new Set(Object.keys(rls.exempt || {}));
for (const t of tables)
  if (!required.has(t) && !conditional.has(t) && !exempt.has(t))
    fail(`DB table ${t}: not classified for RLS; classify it before delivery`);
for (const t of [...required, ...conditional, ...exempt])
  if (!tables.has(t)) fail(`RLS manifest table ${t}: table no longer exists; update security classification`);
for (const [t, reason] of Object.entries(rls.exempt || {}))
  if (!String(reason).trim()) fail(`RLS exemption ${t}: reason is required`);
const rlsSqlFiles = [
  "db/security/rls-baseline.sql",
  ...walk("prisma/migrations").filter((x) => x.endsWith(".sql")),
].filter(exists);
const rlsSql = rlsSqlFiles.map(read).join("\n");
for (const t of [...required, ...conditional]) {
  const tablePattern = `(?:"${t}"|${t})`;
  if (!new RegExp(`ALTER\\s+TABLE\\s+${tablePattern}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`, "i").test(rlsSql))
    fail(`${t}: RLS baseline SQL does not enable row-level security`);
  if (!new RegExp(`CREATE\\s+POLICY[\\s\\S]{0,300}ON\\s+${tablePattern}(?:\\s|$)`, "i").test(rlsSql))
    fail(`${t}: RLS baseline SQL has no policy`);
}

// 4) Authentication middleware / email verification / rate limiting guards.
const proxy = read("proxy.ts");
if (
  !proxy.includes('pathname.startsWith("/dashboard")') ||
  !proxy.includes('pathname.startsWith("/admin")') ||
  !proxy.includes("getSessionCookie")
)
  fail("proxy.ts must protect dashboard/admin with Better Auth session cookie");
const stripCodeComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
const dashboardLayout = stripCodeComments(read("app/dashboard/layout.tsx"));
if (!dashboardLayout.includes("requireUser") || !/\bawait\s+requireUser\(\);/.test(dashboardLayout))
  fail("dashboard layout must perform authoritative server-side session validation");
const adminLayout = stripCodeComments(read("app/admin/layout.tsx"));
if (!adminLayout.includes("requireAdmin") || !/\bawait\s+requireAdmin\(\);/.test(adminLayout))
  fail("admin layout must perform authoritative server-side role/session validation");
const auth = read("lib/auth/index.ts");
if (
  !auth.includes("AUTH_REQUIRE_EMAIL_VERIFICATION") ||
  !auth.includes("requireEmailVerification") ||
  !auth.includes("sendVerificationEmail")
)
  fail("production email verification guard is missing");
if (!auth.includes("rateLimit:") || !auth.includes('"/sign-in/email"') || !auth.includes('"/sign-up/email"'))
  fail("Better Auth rate limiting rules are missing");
const rate = read("lib/security/rate-limit.ts");
if (!rate.includes('backend: "unavailable"') || !rate.includes('process.env.NODE_ENV === "production"'))
  fail("application rate limiter must fail closed in production when distributed backend is unavailable");

// 5) Server-side validation: never trust client-supplied values on mutating routes.
for (const rel of apiRoutes) {
  const text = read(rel);
  const mutating = /export\s+async\s+function\s+(POST|PUT|PATCH|DELETE)\b/.test(text);
  if (!mutating) continue;
  const policy = routeManifest.routes[rel];
  if (!policy || ["none", "client-only", "unclassified"].includes(policy.validation))
    fail(`${rel}: mutating route must declare server-side validation`);
}

// 6) Package auditing must be wired into release gates.
const pkg = JSON.parse(read("package.json"));
if (!String(pkg.scripts?.["audit:prod"] || "").includes("npm audit")) fail("audit:prod must execute npm audit");
for (const gate of ["verify:production", "security:release"])
  if (!String(pkg.scripts?.[gate] || "").includes("audit:prod")) fail(`${gate} must include audit:prod`);
for (const gate of ["verify:code", "verify:production", "ci:check"])
  if (!String(pkg.scripts?.[gate] || "").includes("security:baseline")) fail(`${gate} must include security:baseline`);

if (!exists("package-lock.json"))
  warn(
    "package-lock.json absent: dependency audit reproducibility is weaker until npm install generates and commits it.",
  );

if (warnings.length) for (const w of warnings) console.warn(`WARNING: ${w}`);
if (errors.length) {
  console.error("Security baseline: FAIL");
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log(`Security baseline: PASS — ${apiRoutes.length} API routes and ${tables.size} DB tables classified.`);

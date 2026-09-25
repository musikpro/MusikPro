#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { kitVersion } from "./lib/version.mjs";

const root = process.cwd();
const generatedDir = path.join(root, "generated");
const failures = [];
const warnings = [];
const passes = [];

const requiredFiles = [
  "AGENTS.md", "README.md", "SECURITY.md", "DESIGN.md", "AUDIT.md", "CHANGELOG.md",
  "package.json", ".gitignore", ".env.example", "drizzle.config.ts", "tsconfig.json", "next.config.ts",
  ".agents/skills/setup-saas/SKILL.md", ".agents/skills/security-saas/SKILL.md", ".agents/skills/claude-code/SKILL.md", ".agents/skills/computer-use-claude/SKILL.md", "docs/setup-saas.md", ".agents/skills/computer-use/SKILL.md", "docs/computer-use/antigravity-browser.md", "scripts/computer-use-check.mjs", "scripts/computer-use-mark.mjs",
  ".agents/skills/provider/SKILL.md", "config/provider-skills.json", "scripts/provider.mjs",
  "scripts/setup-saas.mjs", "scripts/security-check.mjs", "scripts/security-audit.sh", "scripts/security-saas.mjs", "scripts/kit-audit.mjs", "scripts/kit-verify.mjs", "scripts/kit-integrity-check.mjs",
  "scripts/mobile-first-check.mjs", "scripts/loading-check.mjs", "scripts/seo-check.mjs",
  "scripts/deployment-check.mjs", "scripts/production-doctor.mjs", "scripts/conformity-check.mjs",
  "components/ui/skeleton.tsx", "components/ui/premium-icon.tsx", "components/mobile-bottom-nav.tsx", "scripts/premium-icon-check.mjs", "docs/ui/premium-icons.md",
  "scripts/security-baseline-check.mjs", "scripts/security-db-check.mjs", "scripts/zod-validation-check.mjs", "scripts/general-refactor-check.mjs", "scripts/dependency-security-floor.mjs", "config/security-dependency-floors.json", "config/zod-validation.json", "lib/validation/auth.ts", "docs/security/zod-validation-gate.md", "config/security-routes.json", "config/security-rls.json", "db/security/rls-baseline.sql", "docs/security/security-baseline-gate.md", ".github/workflows/security-guard.yml", "lib/security/request-guards.ts", "lib/payments/public-result.ts", "tests/security/public-checkout-result.test.ts", "tests/security/request-guards.test.ts", "docs/audit/general-refactor-v0.8.28.md",
  "lib/seo/metadata.ts", "app/robots.ts", "app/sitemap.ts",
  "lib/payments/routing.ts", "lib/billing/reconcile.ts", "lib/billing/webhook.ts",
  "app/api/payments/checkout/route.ts", "db/schema/index.ts",
  "app/api/health/route.ts", "app/api/readyz/route.ts", "lib/health/readiness.ts",
  "vitest.config.ts", "tests/payments/provider-base.test.ts", "tests/payments/capabilities.test.ts", "tests/config/provider-environment.test.ts", "lib/payments/configured.ts",
  "eslint.config.mjs", ".prettierrc.json", "scripts/format-check.mjs", "scripts/route-inventory.mjs", "docs/operations/health-readiness.md", "docs/architecture/starter-capabilities.md", "db/migrations/README.md", "scripts/runtime-check.mjs", "config/features.json", "scripts/feature-inventory.mjs", "lib/observability/logger.ts", "lib/observability/request-id.ts", "lib/api/client.ts", "lib/cron/auth.ts", "scripts/smoke-system.mjs", "scripts/generate-vercel-cron.mjs", "docs/operations/smoke-tests.md", "docs/operations/cron.md", "docs/architecture/izikit-selective-review.md", "docs/architecture/feature-ownership.md", ".codex/README.md", "scripts/banani-prepare.mjs", "scripts/banani-check.mjs", ".agents/skills/import-banani/SKILL.md", "design/banani/import-schema.json", "scripts/import-banani-analyze.mjs", "scripts/import-banani-check.mjs", "docs/design/import-banani.md", "docs/mobile/mobile-app-pipeline.md", "scripts/mobile-app-configure.mjs", "scripts/mobile-app-install.mjs", "scripts/mobile-app-prepare.mjs", "scripts/mobile-app-check.mjs", "CLAUDE.md", ".claude/settings.json", ".claude/commands/setup-saas.md", ".claude/commands/security-saas.md", ".claude/commands/import-banani.md", ".claude/commands/computer-use-claude.md", ".claude/commands/claude-code.md", "scripts/claude-code-check.mjs", "scripts/claude-code-prepare.mjs", "scripts/computer-use-claude-check.mjs", "scripts/computer-use-claude-mark.mjs", "docs/ai/claude-code.md"
];

function ok(label) { passes.push(label); }
function fail(label) { failures.push(label); }
function warn(label) { warnings.push(label); }
function exists(rel) { return fs.existsSync(path.join(root, rel)); }
function read(rel) { return fs.readFileSync(path.join(root, rel), "utf8"); }

for (const f of requiredFiles) exists(f) ? ok(`Fichier requis: ${f}`) : fail(`Fichier manquant: ${f}`);

// JSON integrity
for (const rel of ["package.json", "africa-saas.config.example.json", "config/providers.json", "config/countries.json", "config/deployment-env.json", "config/provider-skills.json", "config/features.json", "config/zod-validation.json", "design/banani/screens.json"]) {
  if (!exists(rel)) { fail(`JSON manquant: ${rel}`); continue; }
  try { JSON.parse(read(rel)); ok(`JSON valide: ${rel}`); } catch (e) { fail(`JSON invalide: ${rel} — ${e.message}`); }
}

// Package scripts expected at the end of setup
if (exists("package.json")) {
  const pkg = JSON.parse(read("package.json"));
  const scripts = pkg.scripts || {};
  const expectedScripts = [
    "setup-saas", "setup-saas:mark", "setup:check", "version:check", "validation:zod-check", "refactor:check", "security:versions", "security:baseline", "security:db-check", "security:release", "security:release:online", "security:check", "security:audit",
    "mobile:check", "mobile:app:configure", "mobile:app:install", "mobile:app:prepare", "mobile:app:check", "ui:icons-check", "ui:loading-check", "seo:check", "deploy:check", "doctor:production",
    "doctor:production:online", "doctor:kit", "dependencies:check", "dependencies:check:production", "kit:integrity", "kit:audit", "kit:verify", "kit:clean", "kit:clean:check", "security-saas", "security-saas:online", "conformity:check", "provider", "typecheck", "build",
    "lint", "format:check", "test", "audit:prod", "routes:list", "runtime:check", "features:list", "features:check", "smoke:system", "cron:generate", "computer-use:check", "computer-use:mark", "computer-use:openai:check", "computer-use:openai:mark", "claude-code:prepare", "claude-code:check", "computer-use:claude:check", "computer-use:claude:mark", "banani:prepare", "banani:check", "import-banani:check", "import-banani:analyze", "clients:crud:setup", "clients:crud:generate", "clients:crud:migrate", "clients:crud:check"
  ];
  for (const name of expectedScripts) scripts[name] ? ok(`Script npm: ${name}`) : fail(`Script npm manquant: ${name}`);
  const latest = Object.entries({ ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) }).filter(([,v]) => v === "latest");
  if (latest.length) fail(`Dépendances non figées: ${latest.map(([k])=>k).join(", ")}`); else ok("Dépendances principales figées");
}

// Git hygiene / secrets files
if (exists(".gitignore")) {
  const lines = new Set(read(".gitignore").split(/\r?\n/).map(x => x.trim()));
  for (const item of [".env", ".env.local", ".env.production", ".env.development", ".env.test", ".africa-saas/", ".codex/config.toml", ".claude/settings.local.json"]) {
    lines.has(item) ? ok(`gitignore: ${item}`) : fail(`.gitignore ne couvre pas explicitement ${item}`);
  }
}
// Local secret files are expected after `npm run setup`. Their presence is not a failure by itself.
// What matters is that Git ignores them and, when a repository exists, they are not tracked.
for (const sensitive of [".env.local", ".env.production", ".env.development", ".env.test"]) {
  if (!exists(sensitive)) {
    ok(`${sensitive} absent du workspace`);
    continue;
  }
  try {
    const { execFileSync } = await import("node:child_process");
    const tracked = execFileSync("git", ["ls-files", "--error-unmatch", sensitive], { cwd: root, stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    if (tracked) fail(`${sensitive} contient potentiellement des secrets et est suivi par Git`);
    else ok(`${sensitive} local présent mais non suivi par Git`);
  } catch {
    ok(`${sensitive} local présent et couvert par .gitignore`);
  }
}

// Keep root clean
const rootFiles = fs.readdirSync(root);
const staleAudit = rootFiles.filter(f => /^AUDIT-V/i.test(f));
const staleChangelog = rootFiles.filter(f => /^CHANGELOG-V/i.test(f));
if (staleAudit.length) fail(`Anciens audits versionnés à la racine: ${staleAudit.join(", ")}`); else ok("Audit racine consolidé");
if (staleChangelog.length) fail(`Anciens changelogs versionnés à la racine: ${staleChangelog.join(", ")}`); else ok("Changelog racine consolidé");

// Core AI workflow coherence
if (exists(".agents/skills/setup-saas/SKILL.md")) {
  const wf = read(".agents/skills/setup-saas/SKILL.md");
  for (const phrase of ["21 phases", "Computer Use", "Claude Code", "Upstash", "Paiements", "Cloudflare", "Cloudinary", "conformity:check", "banani:prepare", ".codex/config.toml"]) {
    wf.includes(phrase) ? ok(`Workflow contient: ${phrase}`) : fail(`Workflow /setup-saas incomplet: ${phrase}`);
  }
}
if (exists("scripts/setup-saas.mjs")) {
  const txt = read("scripts/setup-saas.mjs");
  for (const phrase of ["À quoi sert cette phase ?", "Ce que cela apporte au SaaS", "conformity:check"]) {
    txt.includes(phrase) ? ok(`Setup pédagogique: ${phrase}`) : fail(`Setup pédagogique incomplet: ${phrase}`);
  }
}

// Banani MCP local-secret invariant
if (exists(".gitignore")) {
  const lines = new Set(read(".gitignore").split(/\r?\n/).map(x => x.trim()));
  lines.has(".codex/config.toml") ? ok("Banani MCP config ignoré par Git") : fail(".codex/config.toml doit être ignoré par Git");
}
if (exists("scripts/banani-prepare.mjs")) {
  const txt = read("scripts/banani-prepare.mjs");
  txt.includes('fs.writeFileSync(file, ""') ? ok("Banani prepare crée un fichier vide") : fail("Banani prepare ne doit pas préremplir config.toml");
}

// Auth/email invariants
if (exists("lib/auth/index.ts")) {
  const txt = read("lib/auth/index.ts");
  txt.includes("AUTH_EMAIL_PASSWORD_ENABLED") && txt.includes("AUTH_REQUIRE_EMAIL_VERIFICATION") ? ok("Auth email/password explicitement configurable") : fail("Auth email/password gating incomplet");
}
if (exists("lib/email/index.ts")) {
  const txt = read("lib/email/index.ts");
  txt.includes('NODE_ENV === "production"') ? ok("Email critique fail-closed en production") : fail("Email critique peut être silencieusement perdu en production");
}
if (exists("scripts/setup.mjs")) {
  const txt=read("scripts/setup.mjs");
  txt.includes("emailPasswordEnabled") && txt.includes("googleAuth") ? ok("Setup empêche un SaaS sans méthode d’auth") : fail("Setup ne valide pas la disponibilité d’une méthode d’auth");
}

// Security invariants
if (exists("lib/billing/webhook.ts")) {
  const txt = read("lib/billing/webhook.ts");
  txt.includes("storedEventSummary") ? ok("Webhooks minimisent le payload persisté") : fail("Webhooks: résumé minimisé manquant");
}
if (exists("lib/payments/routing.ts")) {
  const txt = read("lib/payments/routing.ts");
  txt.includes("providerRuntimeAllowed") ? ok("Filtrage runtime providers") : fail("Filtrage runtime providers manquant");
}
if (exists("app/api/payments/checkout/route.ts")) {
  const txt = read("app/api/payments/checkout/route.ts");
  txt.includes("isSafeProviderFallbackError") ? ok("Fallback paiement prudent") : fail("Fallback paiement ambigu non protégé");
}
if (exists("scripts/runtime-check.mjs")) ok("Runtime Node.js gate présent"); else fail("Runtime Node.js gate manquant");
if (exists("config/features.json") && exists("scripts/feature-inventory.mjs")) ok("Feature ownership manifest présent"); else fail("Feature ownership manifest manquant");
if (exists("lib/storage/cloudinary.ts")) { const txt=read("lib/storage/cloudinary.ts"); txt.includes("detectImageType") ? ok("Cloudinary valide le contenu binaire") : fail("Cloudinary magic-byte validation manquante"); }
if (exists("components/ui/skeleton.tsx")) ok("Skeleton loaders présents");
if (exists("scripts/premium-icon-check.mjs") && exists("components/ui/premium-icon.tsx")) ok("Premium Icon Gate présent"); else fail("Premium Icon Gate incomplet");
if (exists("scripts/security-baseline-check.mjs") && exists("config/security-routes.json") && exists("config/security-rls.json") && exists("db/security/rls-baseline.sql")) ok("Security Baseline Gate présent"); else fail("Security Baseline Gate incomplet");
if (exists("scripts/general-refactor-check.mjs") && exists("lib/security/request-guards.ts") && exists("lib/payments/public-result.ts")) ok("General Refactor Gate présent"); else fail("General Refactor Gate incomplet");
if (exists("app/robots.ts") && exists("app/sitemap.ts")) ok("SEO crawl files présents");

// package-lock is mandatory for final conformity, but only after npm install
exists("package-lock.json") ? ok("package-lock.json présent") : warn("package-lock.json absent dans le starter — lancez npm install avant la production; dependencies:check:production l’exigera.");

// Generated config: optional before setup but warning at final conformity
if (!exists("africa-saas.config.json")) warn("africa-saas.config.json absent — normal seulement si le setup n’a pas encore été exécuté");
if (!exists("generated/deployment-handoff.md")) warn("Deployment handoff non généré — lancer npm run deploy:handoff avant mise en ligne");
if (!exists("generated/production-doctor.json") && !exists("generated/production-doctor.md")) warn("Production Doctor non généré — lancer npm run doctor:production avant mise en ligne");

const status = failures.length ? "FAIL" : "PASS";
const report = [
  "# Africa SaaS Kit — Rapport de conformité final",
  "",
  `**Statut : ${status}**`,
  `**PASS : ${passes.length} · WARN : ${warnings.length} · FAIL : ${failures.length}**`,
  "",
  "## Échecs bloquants",
  ...(failures.length ? failures.map(x => `- ❌ ${x}`) : ["- ✅ Aucun"]),
  "",
  "## Avertissements",
  ...(warnings.length ? warnings.map(x => `- ⚠️ ${x}`) : ["- ✅ Aucun"]),
  "",
  "## Contrôles conformes",
  ...passes.map(x => `- ✅ ${x}`),
  "",
  "> Ce test vérifie la conformité structurelle des fichiers du kit. Il ne remplace pas les tests dynamiques Neon, OAuth, emails, paiements sandbox, build réel et staging.",
  ""
].join("\n");

fs.mkdirSync(generatedDir, { recursive: true });
fs.writeFileSync(path.join(generatedDir, "conformity-report.md"), report);
fs.writeFileSync(path.join(generatedDir, "conformity-report.json"), JSON.stringify({ version: kitVersion, generatedAt: new Date().toISOString(), status, passes, warnings, failures }, null, 2));
console.log(report);
if (failures.length) process.exit(1);

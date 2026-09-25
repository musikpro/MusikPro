#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const online = args.has("--online");
const jsonOnly = args.has("--json");
const generated = path.join(root, "generated");
fs.mkdirSync(generated, { recursive: true });

const exists = (rel) => fs.existsSync(path.join(root, rel));
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const checks = [];
const add = (id, label, status, detail, evidence = []) => checks.push({ id, label, status, detail, evidence });

function runNode(rel, extra = []) {
  const out = spawnSync(process.execPath, [path.join(root, rel), ...extra], {
    cwd: root,
    encoding: "utf8",
    env: process.env,
  });
  return { ok: out.status === 0, status: out.status, text: `${out.stdout || ""}${out.stderr || ""}`.trim() };
}
function runCmd(cmd, argv) {
  const out = spawnSync(cmd, argv, { cwd: root, encoding: "utf8", env: process.env });
  return { ok: out.status === 0, status: out.status, text: `${out.stdout || ""}${out.stderr || ""}`.trim() };
}

// Scan source files for common leaked credentials. This complements the baseline gate.
const sourceExt = /\.(?:ts|tsx|js|mjs|cjs|json|sql|yml|yaml|md)$/i;
const ignoredDirs = new Set(["node_modules", ".next", ".git", "coverage", "dist", "out", "generated"]);
let scannedFiles = 0;
const leaks = [];
const secretPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bsk_(?:live|test)_[A-Za-z0-9_-]{12,}\b/,
  /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/,
];
function walk(abs) {
  for (const ent of fs.readdirSync(abs, { withFileTypes: true })) {
    if (ignoredDirs.has(ent.name)) continue;
    const full = path.join(abs, ent.name);
    if (ent.isDirectory()) walk(full);
    else if (sourceExt.test(ent.name)) {
      scannedFiles++;
      const text = fs.readFileSync(full, "utf8");
      if (secretPatterns.some((re) => re.test(text))) leaks.push(path.relative(root, full).replaceAll("\\", "/"));
    }
  }
}
walk(root);
add(
  "source-secret-scan",
  "Secrets / clés API dans les fichiers",
  leaks.length ? "fail" : "pass",
  leaks.length
    ? `Identifiants potentiels détectés dans ${leaks.length} fichier(s).`
    : `${scannedFiles} fichiers source scannés : aucune clé privée/credential évidente détectée.`,
  leaks.slice(0, 12),
);

const gitignore = exists(".gitignore")
  ? read(".gitignore")
      .split(/\r?\n/)
      .map((x) => x.trim())
  : [];
add(
  "env-gitignore",
  ".env.local protégé par .gitignore",
  gitignore.includes(".env.local") || gitignore.includes(".env*") ? "pass" : "fail",
  gitignore.includes(".env.local") || gitignore.includes(".env*")
    ? ".env.local est ignoré par Git."
    : "Ajoutez explicitement .env.local à .gitignore.",
);

const envFiles = [".env.local", ".env", ".env.production", ".env.development"].filter(exists);
let publicSecret = false;
for (const rel of envFiles)
  if (/^NEXT_PUBLIC_[A-Z0-9_]*(?:SECRET|TOKEN|PRIVATE|API_KEY|DATABASE)[A-Z0-9_]*\s*=/im.test(read(rel)))
    publicSecret = true;
add(
  "env-secrets",
  "Clés API côté serveur / .env.local",
  publicSecret ? "fail" : envFiles.length ? "pass" : "warn",
  publicSecret
    ? "Une variable sensible NEXT_PUBLIC_* expose potentiellement un secret au navigateur."
    : envFiles.length
      ? `Variables d'environnement détectées dans ${envFiles.join(", ")}; aucun secret NEXT_PUBLIC_* évident.`
      : ".env.local absent : acceptable pour le starter, à créer localement pour un SaaS configuré. Ne jamais le committer.",
);

if (exists(".git") || exists(".git/HEAD")) {
  const tracked = runCmd("git", ["ls-files", "--", ".env.local", ".env", ".env.production"]);
  add(
    "env-not-tracked",
    "Fichiers secrets non suivis par Git",
    tracked.ok && !tracked.text.trim() ? "pass" : tracked.ok ? "fail" : "warn",
    tracked.ok
      ? tracked.text.trim()
        ? `Fichier(s) sensible(s) suivis par Git : ${tracked.text.replace(/\n/g, ", ")}`
        : "Aucun fichier d'environnement sensible suivi par Git."
      : "Impossible de vérifier l'index Git dans cette copie.",
  );
} else
  add(
    "env-not-tracked",
    "Fichiers secrets non suivis par Git",
    "warn",
    "Répertoire .git absent : vérification de l'index Git impossible dans cette copie.",
  );

const baseline = runNode("scripts/security-baseline-check.mjs");
add(
  "baseline",
  "Security Baseline (auth, routes, rate limiting, RLS statique)",
  baseline.ok ? "pass" : "fail",
  baseline.ok ? "Le garde-fou sécurité structurel passe." : "Le Security Baseline échoue.",
  baseline.text ? [baseline.text.slice(0, 1600)] : [],
);

const zod = runNode("scripts/zod-validation-check.mjs");
add(
  "zod",
  "Zod — validation client + serveur",
  zod.ok ? "pass" : "fail",
  zod.ok
    ? "Toutes les Server Actions, routes mutantes et formulaires auth couverts respectent le gate Zod."
    : "Le gate Zod détecte des entrées non validées.",
  zod.text ? [zod.text.slice(0, 1600)] : [],
);

const security = runNode("scripts/security-check.mjs");
add(
  "security-preflight",
  "Middleware, email vérifié, webhooks et garde-fous",
  security.ok ? "pass" : "fail",
  security.ok ? "Le préflight sécurité global passe." : "Le préflight sécurité global échoue.",
  security.text ? [security.text.slice(0, 1600)] : [],
);

const floors = runNode("scripts/dependency-security-floor.mjs");
add(
  "dependency-floors",
  "Versions minimales des packages sensibles",
  floors.ok ? "pass" : "fail",
  floors.ok
    ? "Les planchers de versions de sécurité sont respectés."
    : "Une dépendance est sous le plancher de sécurité.",
  floors.text ? [floors.text.slice(0, 1200)] : [],
);

if (exists("package-lock.json")) {
  const audit = runCmd(process.platform === "win32" ? "npm.cmd" : "npm", [
    "audit",
    "--omit=dev",
    "--audit-level=high",
    "--json",
  ]);
  add(
    "npm-audit",
    "Packages vérifiés — npm audit",
    audit.ok ? "pass" : "fail",
    audit.ok
      ? "npm audit production ne signale aucune vulnérabilité high/critical."
      : "npm audit signale une vulnérabilité high/critical ou n'a pas pu terminer.",
    audit.text ? [audit.text.slice(0, 1800)] : [],
  );
} else
  add(
    "npm-audit",
    "Packages vérifiés — npm audit",
    "warn",
    "package-lock.json absent : npm audit reproductible impossible. Lancez npm install puis relancez /security-saas.",
  );

const rlsManifest = exists("config/security-rls.json") ? JSON.parse(read("config/security-rls.json")) : null;
const prismaRlsFiles = exists("prisma/migrations")
  ? fs
      .readdirSync(path.join(root, "prisma/migrations"), { withFileTypes: true })
      .filter((x) => x.isDirectory())
      .map((x) => `prisma/migrations/${x.name}/migration.sql`)
      .filter(exists)
  : [];
const rlsSqlFiles = ["db/security/rls-baseline.sql", ...prismaRlsFiles].filter(exists);
const rlsSql = rlsSqlFiles.map(read).join("\n");
const requiredTables = Object.keys(rlsManifest?.required || {});
const conditionalTables = Object.keys(rlsManifest?.conditional || {});
const securedTables = [...requiredTables, ...conditionalTables];
let staticRlsOk = Boolean(rlsManifest && rlsSql && securedTables.length);
for (const table of securedTables) {
  const tablePattern = `(?:"${table}"|${table})`;
  if (!new RegExp(`ALTER\\s+TABLE\\s+${tablePattern}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`, "i").test(rlsSql))
    staticRlsOk = false;
  if (!new RegExp(`CREATE\\s+POLICY[\\s\\S]{0,300}ON\\s+${tablePattern}(?:\\s|$)`, "i").test(rlsSql))
    staticRlsOk = false;
}
add(
  "rls-static",
  "RLS + Policies déclarées dans le code",
  staticRlsOk ? "pass" : "fail",
  staticRlsOk
    ? `${requiredTables.length} table(s) obligatoires + ${conditionalTables.length} conditionnelle(s) ont ENABLE RLS + policy dans les migrations/baselines.`
    : "Le baseline RLS/policies est incomplet.",
);

const hasDbUrl = Boolean(process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL);
if (online && hasDbUrl && exists("node_modules/@neondatabase/serverless")) {
  const db = runNode("scripts/security-db-check.mjs");
  add(
    "rls-live",
    "RLS active réellement dans Neon/Postgres",
    db.ok ? "pass" : "fail",
    db.ok
      ? "RLS et policies vérifiées sur la base réelle."
      : "La base réelle ne respecte pas toutes les règles RLS/policies.",
    db.text ? [db.text.slice(0, 1600)] : [],
  );
} else {
  add(
    "rls-live",
    "RLS active réellement dans Neon/Postgres",
    "warn",
    online
      ? !hasDbUrl
        ? "DATABASE_URL[_DIRECT] absente : contrôle live impossible."
        : "Dépendances non installées : contrôle live impossible."
      : "Contrôle live non exécuté. Utilisez npm run security-saas:online avec DATABASE_URL[_DIRECT] pour vérifier la base réelle.",
  );
}

const pkg = JSON.parse(read("package.json"));
const zodVersion = pkg.dependencies?.zod;
add(
  "zod-package",
  "Package Zod présent et obligatoire",
  zodVersion ? "pass" : "fail",
  zodVersion ? `zod ${zodVersion} est déclaré dans dependencies.` : "zod est absent des dépendances.",
);

const proxy = exists("proxy.ts") ? read("proxy.ts") : "";
add(
  "auth-middleware",
  "Middleware / proxy d'authentification",
  /getSessionCookie/.test(proxy) && /dashboard/.test(proxy) && /admin/.test(proxy) ? "pass" : "fail",
  /getSessionCookie/.test(proxy) && /dashboard/.test(proxy) && /admin/.test(proxy)
    ? "Les zones dashboard/admin ont une pré-protection de session; les layouts serveur restent l'autorité."
    : "Protection proxy dashboard/admin incomplète.",
);

const authText = exists("lib/auth/index.ts") ? read("lib/auth/index.ts") : "";
add(
  "email-verification",
  "Vérification par email",
  /requireEmailVerification/.test(authText) && /sendVerificationEmail/.test(authText) ? "pass" : "fail",
  /requireEmailVerification/.test(authText) && /sendVerificationEmail/.test(authText)
    ? "La vérification email est câblée dans Better Auth."
    : "Vérification email incomplète.",
);

const rateText = exists("lib/security/rate-limit.ts") ? read("lib/security/rate-limit.ts") : "";
add(
  "rate-limit",
  "Rate limiting",
  /production/.test(rateText) && /unavailable/.test(rateText) && exists("config/security-routes.json")
    ? "pass"
    : "fail",
  /production/.test(rateText) && /unavailable/.test(rateText)
    ? "Rate limiter présent avec comportement fail-closed en production et classification par route."
    : "Rate limiting incomplet.",
);

const pass = checks.filter((x) => x.status === "pass").length;
const warn = checks.filter((x) => x.status === "warn").length;
const fail = checks.filter((x) => x.status === "fail").length;
const score = checks.length ? Math.round(((pass + warn * 0.5) / checks.length) * 100) : 0;
let rank =
  score >= 98 && fail === 0 && warn === 0
    ? "S"
    : score >= 90 && fail === 0
      ? "A"
      : score >= 80 && fail <= 1
        ? "B"
        : score >= 70
          ? "C"
          : score >= 60
            ? "D"
            : "F";
if (fail >= 3) rank = "F";
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  mode: online ? "online" : "static",
  score,
  rank,
  summary: { pass, warn, fail, total: checks.length, scannedFiles },
  checks,
};

fs.writeFileSync(path.join(generated, "security-saas-report.json"), JSON.stringify(report, null, 2) + "\n");
const md = [
  "# /security-saas — Rapport de sécurité",
  "",
  `- Date : ${report.generatedAt}`,
  `- Mode : ${report.mode}`,
  `- Score : ${score}%`,
  `- Rang : ${rank}`,
  `- Résultat : ${pass} PASS · ${warn} À VÉRIFIER · ${fail} FAIL`,
  `- Fichiers scannés : ${scannedFiles}`,
  "",
  ...checks.flatMap((c) => [
    `## ${c.status === "pass" ? "✅" : c.status === "warn" ? "⚠️" : "❌"} ${c.label}`,
    "",
    c.detail,
    ...(c.evidence.length ? ["", "```text", ...c.evidence, "```"] : []),
    "",
  ]),
].join("\n");
fs.writeFileSync(path.join(generated, "security-saas-report.md"), md);

if (jsonOnly) console.log(JSON.stringify(report, null, 2));
else {
  console.log(`SECURITY-SAAS — ${fail ? "FAIL" : "AUDIT COMPLETE"}`);
  console.log(`Score: ${score}% — Rang ${rank}`);
  console.log(`${pass} PASS · ${warn} À VÉRIFIER · ${fail} FAIL · ${scannedFiles} fichiers scannés`);
  for (const c of checks)
    console.log(`${c.status === "pass" ? "✅" : c.status === "warn" ? "⚠️" : "❌"} ${c.label}: ${c.detail}`);
  console.log("Rapports: generated/security-saas-report.md + .json");
}
process.exitCode = fail ? 1 : 0;

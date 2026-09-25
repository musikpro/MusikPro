#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { kitVersion, kitVersionLabel } from "./lib/version.mjs";

const root = process.cwd();
const generated = path.join(root, "generated");
fs.mkdirSync(generated, { recursive: true });

const staticChecks = [
  ["Intégrité fichiers critiques", process.execPath, ["scripts/kit-integrity-check.mjs"]],
  ["Audit statique global", process.execPath, ["scripts/kit-audit.mjs"]],
  ["Conformité structurelle", process.execPath, ["scripts/conformity-check.mjs"]],
  ["Security Baseline", process.execPath, ["scripts/security-baseline-check.mjs"]],
  ["Validation Zod", process.execPath, ["scripts/zod-validation-check.mjs"]],
  ["Refactor Gate", process.execPath, ["scripts/general-refactor-check.mjs"]],
  ["Inventaire fonctionnalités", process.execPath, ["scripts/feature-inventory.mjs"]],
  ["CRUD Clients", process.execPath, ["scripts/clients-crud-check.mjs"]],
  ["Mobile-first", process.execPath, ["scripts/mobile-first-check.mjs"]],
  ["Pipeline mobile", process.execPath, ["scripts/mobile-app-check.mjs"]],
  ["Déploiement", process.execPath, ["scripts/deployment-check.mjs"]],
  ["Staging Gate", process.execPath, ["scripts/staging-check.mjs"]],
  ["Claude Code", process.execPath, ["scripts/claude-code-check.mjs"]],
  ["Readiness UI / voyants", process.execPath, ["scripts/readiness-ui-check.mjs"]],
  ["Préparation installation", process.execPath, ["scripts/installation-readiness-check.mjs"]],
];

const dynamicChecks = [
  ["Format", "npm", ["run", "format:check"]],
  ["Lint", "npm", ["run", "lint"]],
  ["TypeScript", "npm", ["run", "typecheck"]],
  ["Tests Vitest", "npm", ["run", "test"]],
  ["Build Next.js", "npm", ["run", "build"]],
  ["Audit dépendances production", "npm", ["run", "audit:prod"]],
];

const results = [];
function run(label, command, args, dynamic = false, blocking = true) {
  process.stdout.write(`\n=== ${label} ===\n`);
  const started = Date.now();
  const r = spawnSync(command, args, { cwd: root, encoding: "utf8", env: process.env });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  const status = r.status === 0 ? "PASS" : blocking ? "FAIL" : "WARN";
  results.push({ label, status, exitCode: r.status ?? 1, dynamic, blocking, durationMs: Date.now() - started });
  return r.status === 0;
}

console.log(`Africa SaaS Kit ${kitVersionLabel} — Test d'intégrité complet`);
console.log("Objectif : vérifier les fonctions du kit sans modifier la configuration du SaaS.");

for (const [label, command, args] of staticChecks) {
  const blocking = label !== "Préparation installation";
  run(label, command, args, false, blocking);
}

const hasLock = ["package-lock.json", "pnpm-lock.yaml", "yarn.lock"].some((f) => fs.existsSync(path.join(root, f)));
const hasModules = fs.existsSync(path.join(root, "node_modules"));
let dynamicState = "PENDING";
if (hasLock && hasModules) {
  let dynamicOk = true;
  for (const [label, command, args] of dynamicChecks) {
    if (!run(label, command, args, true, true)) dynamicOk = false;
  }
  dynamicState = dynamicOk ? "PASS" : "FAIL";
} else {
  console.log("\n=== Tests dynamiques ===");
  console.log("PENDING — dépendances non installées dans cette copie du kit.");
  if (!hasLock) console.log("○ lockfile absent");
  if (!hasModules) console.log("○ node_modules absent");
  console.log("→ Après npm install, relancer : npm run kit:full-test");
  for (const [label] of dynamicChecks)
    results.push({ label, status: "PENDING", exitCode: null, dynamic: true, blocking: true, durationMs: 0 });
}

const failures = results.filter((r) => r.status === "FAIL");
const warnings = results.filter((r) => r.status === "WARN");
const passes = results.filter((r) => r.status === "PASS").length;
const pending = results.filter((r) => r.status === "PENDING").length;
const report = {
  version: kitVersion,
  generatedAt: new Date().toISOString(),
  status: failures.length
    ? "FAIL"
    : dynamicState === "PENDING"
      ? "STATIC_PASS_DYNAMIC_PENDING"
      : warnings.length
        ? "PASS_WITH_WARNINGS"
        : "PASS",
  summary: { pass: passes, warn: warnings.length, fail: failures.length, pending },
  results,
};

fs.writeFileSync(path.join(generated, "full-integrity-report.json"), JSON.stringify(report, null, 2));
const md = [
  `# Africa SaaS Kit — Test d'intégrité complet`,
  ``,
  `- Version : ${kitVersionLabel}`,
  `- Statut : **${report.status}**`,
  `- PASS : ${passes}`,
  `- WARN : ${warnings.length}`,
  `- FAIL : ${failures.length}`,
  `- PENDING : ${pending}`,
  ``,
  `| Contrôle | Statut | Type |`,
  `|---|---|---|`,
  ...results.map((r) => `| ${r.label} | ${r.status} | ${r.dynamic ? "dynamique" : "statique"} |`),
  ``,
  failures.length
    ? `## Échecs\n${failures.map((r) => `- ${r.label}`).join("\n")}`
    : `## Échecs\nAucun échec bloquant détecté.`,
  ``,
  warnings.length
    ? `## Avertissements\n${warnings.map((r) => `- ${r.label}`).join("\n")}`
    : `## Avertissements\nAucun avertissement de contrôle.`,
  ``,
  `> Les tests dynamiques nécessitent les dépendances installées. Le rapport statique vérifie la structure et les garde-fous du kit, mais ne remplace pas les tests sandbox fournisseurs, Neon réel et staging.`,
  ``,
].join("\n");
fs.writeFileSync(path.join(generated, "full-integrity-report.md"), md);

console.log(`\nRapport : generated/full-integrity-report.md + generated/full-integrity-report.json`);
if (failures.length) {
  console.error(`Test d'intégrité complet : FAIL — ${failures.length} contrôle(s) en échec.`);
  process.exit(1);
}
if (dynamicState === "PENDING") {
  console.log(`Test d'intégrité complet : STATIC PASS · DYNAMIC PENDING`);
  process.exit(0);
}
console.log(
  `Test d'intégrité complet : ${warnings.length ? "PASS WITH WARNINGS" : "PASS"} — tous les contrôles exécutables ont réussi.`,
);

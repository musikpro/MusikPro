#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const configPath = path.join(root, "config/critical-flows.json");
if (!fs.existsSync(configPath)) {
  console.error("Critical Flow Gate — FAIL — config/critical-flows.json manquant");
  process.exit(1);
}
const cfg = JSON.parse(fs.readFileSync(configPath, "utf8"));
const failures = [];
for (const flow of cfg.flows || []) {
  if (!flow.id || !Array.isArray(flow.evidence) || !flow.evidence.length) {
    failures.push(`flow invalide: ${flow.id || "sans id"}`);
    continue;
  }
  for (const rel of flow.evidence) if (!fs.existsSync(path.join(root, rel))) failures.push(`${flow.id}: preuve structurelle manquante ${rel}`);
}
for (const marker of ["emailAndPassword", "requireEmailVerification", "revokeSessionsOnPasswordReset", "rateLimit:"]) {
  const auth = fs.existsSync(path.join(root, "lib/auth/index.ts")) ? fs.readFileSync(path.join(root, "lib/auth/index.ts"), "utf8") : "";
  if (!auth.includes(marker)) failures.push(`auth critique: marqueur manquant ${marker}`);
}
if (failures.length) {
  console.error("Critical Flow Gate — FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

const execute = process.argv.includes("--execute");
if (execute) {
  const hasModules = fs.existsSync(path.join(root, "node_modules"));
  if (!hasModules) {
    console.error("Critical Flow Gate — PENDING — node_modules absent; impossible d'exécuter Vitest.");
    process.exit(2);
  }
  const run = spawnSync("npm", ["run", "test", "--", "tests/security/request-guards.test.ts", "tests/security/public-checkout-result.test.ts", "tests/quality/access-control.test.ts"], { cwd: root, encoding: "utf8" });
  if (run.stdout) process.stdout.write(run.stdout);
  if (run.stderr) process.stderr.write(run.stderr);
  if (run.status !== 0) process.exit(1);
  console.log("Critical Flow Gate — PASS — structure + sous-ensemble de tests exécuté.");
} else {
  console.log(`Critical Flow Gate — PASS — ${(cfg.flows || []).length} parcours disposent d'une couverture structurelle. Les scénarios live restent NON VÉRIFIÉS jusqu'au test réel.`);
}

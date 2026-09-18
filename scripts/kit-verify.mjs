#!/usr/bin/env node
import fs from "node:fs";
import { spawnSync } from "node:child_process";

const root = process.cwd();

function run(label, command, args) {
  console.log(`\n=== ${label} ===`);
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit", env: process.env });
  if (result.status !== 0) {
    console.error(`\nKit verify: FAIL — ${label}`);
    process.exit(result.status ?? 1);
  }
}

console.log("Africa SaaS Kit — vérification intelligente\n");
run("Audit statique complet", process.execPath, ["scripts/kit-audit.mjs"]);
run("Audit sécurité SaaS", process.execPath, ["scripts/security-saas.mjs"]);

const lock = fs.existsSync("package-lock.json");
const modules = fs.existsSync("node_modules");

if (!lock || !modules) {
  console.log("\nKit verify: STATIC PASS · DYNAMIC PENDING");
  if (!lock) console.log("○ package-lock.json absent");
  if (!modules) console.log("○ node_modules absent");
  console.log("\nÉtape suivante : npm install");
  console.log("Puis relancez : npm run kit:verify");
  console.log("Pour la certification de mise en production : npm run verify:production");
  process.exit(0);
}

run("Contrôles dynamiques du code", "npm", ["run", "verify:code"]);
console.log("\nKit verify: PASS — audit statique + sécurité + contrôles dynamiques réussis.");
console.log("Avant production, exécutez encore : npm run verify:production");

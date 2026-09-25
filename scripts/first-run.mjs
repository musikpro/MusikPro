#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { kitVersionLabel } from "./lib/version.mjs";

const root = process.cwd();
const install = process.argv.includes("--install");
const failures = [];
const warnings = [];
const notes = [];
const exists = (rel) => fs.existsSync(path.join(root, rel));

function run(command, args, label) {
  const r = spawnSync(command, args, { cwd: root, stdio: "inherit", env: process.env });
  if (r.status !== 0) failures.push(`${label} a échoué (code ${r.status ?? 1})`);
  return r.status === 0;
}

const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 20 || (major === 20 && minor < 9))
  failures.push(`Node.js ${process.versions.node} trop ancien — Node >=20.9.0 requis.`);
else notes.push(`Node.js ${process.versions.node}`);

try {
  const npm = spawnSync("npm", ["--version"], { cwd: root, encoding: "utf8" });
  if (npm.status !== 0) failures.push("npm est introuvable dans le PATH.");
  else notes.push(`npm ${(npm.stdout || "").trim()}`);
} catch {
  failures.push("npm est introuvable dans le PATH.");
}

if (!exists("package.json")) failures.push("package.json absent.");
if (!exists(".gitignore")) failures.push(".gitignore absent.");
else {
  const gitignore = fs.readFileSync(path.join(root, ".gitignore"), "utf8");
  if (!/(^|\n)\.env\.local(?:\n|$)/.test(gitignore)) failures.push(".env.local n'est pas ignoré par Git.");
  if (!/(^|\n)node_modules\/?(?:\n|$)/.test(gitignore))
    warnings.push("node_modules n'est pas explicitement ignoré par Git.");
}

console.log(`\nAfrica SaaS Kit ${kitVersionLabel} — Premier démarrage\n`);
for (const n of notes) console.log(`✓ ${n}`);
for (const w of warnings) console.warn(`⚠ ${w}`);
for (const f of failures) console.error(`✗ ${f}`);
if (failures.length) process.exit(1);

console.log("\n1/3 — Audit statique du kit");
if (!run(process.execPath, ["scripts/kit-audit.mjs"], "kit:audit")) process.exit(1);

const lock = exists("package-lock.json");
const modules = exists("node_modules");
if (!lock || !modules) {
  if (!install) {
    console.log("\n2/3 — Dépendances non installées");
    console.log("○ Aucun changement automatique effectué.");
    console.log("→ Lancez `npm run first-run:install` pour exécuter npm install, ou `npm install` manuellement.");
  } else {
    console.log("\n2/3 — Installation des dépendances");
    if (!run("npm", ["install"], "npm install")) process.exit(1);
  }
} else {
  console.log("\n2/3 — Dépendances déjà présentes");
  console.log("✓ package-lock.json et node_modules détectés");
}

console.log("\n3/3 — État de préparation");
run(process.execPath, ["scripts/kit-doctor.mjs"], "doctor:kit");

if (!exists("africa-saas.config.json")) {
  console.log("\nProchaine étape : `npm run setup` pour créer africa-saas.config.json et .env.local.");
} else {
  console.log("\nConfiguration de base détectée. Continuez avec `/setup-saas` ou `npm run setup-saas`.");
}

if (exists("package-lock.json") && exists("node_modules")) {
  console.log("Pour une vérification complète du code : `npm run kit:verify`.");
  console.log("Pour le test d’intégrité complet : `npm run kit:full-test`.");
}

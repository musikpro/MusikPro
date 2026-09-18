#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const production = process.argv.includes("--production");
const failures = [];
const warnings = [];
const notes = [];

const pkgPath = path.join(root, "package.json");
if (!fs.existsSync(pkgPath)) failures.push("package.json absent");
let pkg = {};
try { pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")); } catch { failures.push("package.json invalide"); }

const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 20 || (major === 20 && minor < 9)) failures.push(`Node.js ${process.versions.node} trop ancien — Node >=20.9.0 requis`);
else notes.push(`Node.js ${process.versions.node}`);

const lock = fs.existsSync(path.join(root, "package-lock.json"));
const modules = fs.existsSync(path.join(root, "node_modules"));
if (!lock) {
  const msg = "package-lock.json absent — exécutez npm install une fois puis conservez le lockfile";
  (production ? failures : warnings).push(msg);
} else notes.push("package-lock.json présent");

if (!modules) {
  const msg = "node_modules absent — exécutez npm install (ou npm ci si package-lock.json existe)";
  (production ? failures : warnings).push(msg);
} else notes.push("node_modules présent");

const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
for (const [name, version] of Object.entries(deps)) {
  if (typeof version !== "string" || /^(latest|next|\*|workspace:\*)$/i.test(version)) failures.push(`Dépendance non figée: ${name}@${version}`);
}

console.log(`Dependency install check: ${failures.length ? "FAIL" : "PASS"}${production ? " (production)" : " (starter)"}`);
for (const n of notes) console.log(`✓ ${n}`);
for (const w of warnings) console.warn(`⚠ ${w}`);
for (const f of failures) console.error(`✗ ${f}`);
if (!production && warnings.length) console.log("Starter intact: ces avertissements sont attendus avant la première installation locale.");
if (failures.length) process.exit(1);

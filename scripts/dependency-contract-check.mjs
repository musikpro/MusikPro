#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
const failures = [];
const notes = [];

function exact(name) {
  const value = deps[name];
  if (!value) return null;
  if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(value))
    failures.push(`${name} doit être figé sur une version exacte, reçu: ${value}`);
  return value;
}

for (const name of Object.keys(deps)) exact(name);

const alignedPairs = [
  ["next", "eslint-config-next"],
  ["react", "react-dom"],
  ["prisma", "@prisma/client"],
  ["better-auth", "auth"],
];
for (const [a, b] of alignedPairs) {
  if (deps[a] && deps[b] && deps[a] !== deps[b]) failures.push(`${a}@${deps[a]} doit être aligné avec ${b}@${deps[b]}`);
  else if (deps[a] && deps[b]) notes.push(`${a}/${b}: ${deps[a]}`);
}

const capacitorNames = ["@capacitor/core", "@capacitor/cli", "@capacitor/android", "@capacitor/ios"];
const capacitorInstalled = capacitorNames.filter((name) => deps[name]);
if (capacitorInstalled.length) {
  const versions = new Set(capacitorInstalled.map((name) => deps[name]));
  if (versions.size !== 1)
    failures.push(
      `Les packages Capacitor installés doivent avoir la même version: ${capacitorInstalled.map((n) => `${n}@${deps[n]}`).join(", ")}`,
    );
  if (!deps["@capacitor/core"] || !deps["@capacitor/cli"])
    failures.push("Une installation Capacitor doit inclure @capacitor/core et @capacitor/cli.");
  notes.push(`Capacitor: ${capacitorInstalled.map((n) => `${n}@${deps[n]}`).join(", ")}`);
} else {
  notes.push("Capacitor non installé dans le starter: état optionnel attendu.");
}

console.log(`Dependency contract: ${failures.length ? "FAIL" : "PASS"}`);
for (const note of notes) console.log(`✓ ${note}`);
for (const failure of failures) console.error(`✗ ${failure}`);
if (failures.length) process.exit(1);

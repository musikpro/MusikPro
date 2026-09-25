#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const apply = process.argv.includes("--apply");
const removableDirs = [".next", "coverage", "out", ".turbo"];
const removableFiles = ["tsconfig.tsbuildinfo", "npm-debug.log", "yarn-error.log", "pnpm-debug.log"];
const generatedKeep = new Set([".gitkeep"]);
const targets = [];

for (const rel of removableDirs) {
  const p = path.join(root, rel);
  if (fs.existsSync(p)) targets.push(rel);
}
for (const rel of removableFiles) {
  const p = path.join(root, rel);
  if (fs.existsSync(p)) targets.push(rel);
}

const generated = path.join(root, "generated");
if (fs.existsSync(generated)) {
  for (const name of fs.readdirSync(generated)) {
    if (!generatedKeep.has(name)) targets.push(path.join("generated", name));
  }
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    const rel = path.relative(root, abs);
    if (entry.isDirectory()) {
      if (["node_modules", ".git"].includes(entry.name)) continue;
      walk(abs);
    } else if (
      entry.name === ".DS_Store" ||
      entry.name.endsWith(".log") ||
      entry.name.endsWith(".tmp") ||
      entry.name.endsWith(".bak")
    ) {
      if (!targets.includes(rel)) targets.push(rel);
    }
  }
}
walk(root);

targets.sort();
if (!targets.length) {
  console.log("Kit cleanup: PASS — no transient files found.");
  process.exit(0);
}
console.log(`Kit cleanup: ${targets.length} transient item(s) detected.`);
for (const rel of targets) console.log(`${apply ? "REMOVE" : "WOULD REMOVE"} ${rel}`);
if (!apply) {
  console.log("\nDry run only. Use npm run kit:clean to remove these files.");
  process.exit(1);
}
for (const rel of targets) fs.rmSync(path.join(root, rel), { recursive: true, force: true });
fs.mkdirSync(generated, { recursive: true });
const keep = path.join(generated, ".gitkeep");
if (!fs.existsSync(keep)) fs.writeFileSync(keep, "");
console.log("\nKit cleanup: completed.");

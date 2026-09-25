#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const apiRoot = path.join(root, "app", "api");
const errors = [];
const files = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name === "route.ts") files.push(full);
  }
}
walk(apiRoot);
if (!files.length) errors.push("Aucune route API détectée sous app/api/**/route.ts");
for (const file of files) {
  const src = fs.readFileSync(file, "utf8");
  const rel = path.relative(root, file);
  if (/export\s+const\s+runtime\s*=\s*['"]edge['"]/.test(src))
    errors.push(`${rel}: runtime=edge interdit pour ce starter`);
  if (!/export\s+const\s+runtime\s*=\s*['"]nodejs['"]/.test(src))
    errors.push(`${rel}: export const runtime = "nodejs" manquant`);
}

if (errors.length) {
  console.error("Runtime preflight: FAIL");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`Runtime preflight: PASS (${files.length} routes Node.js)`);

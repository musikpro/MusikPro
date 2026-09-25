#!/usr/bin/env node
import fs from "node:fs";

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const policy = JSON.parse(fs.readFileSync("config/security-dependency-floors.json", "utf8"));
const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
const errors = [];

function numeric(version) {
  const clean = String(version)
    .trim()
    .replace(/^[~^<>=v\s]+/, "");
  const match = clean.match(/^(\d+)\.(\d+)\.(\d+)/);
  return match ? match.slice(1).map(Number) : null;
}
function gte(actual, minimum) {
  const a = numeric(actual),
    b = numeric(minimum);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) {
    if (a[i] > b[i]) return true;
    if (a[i] < b[i]) return false;
  }
  return true;
}

for (const [name, rule] of Object.entries(policy.packages || {})) {
  const version = deps[name];
  if (!version) {
    errors.push(`${name}: dependency missing`);
    continue;
  }
  if (!gte(version, rule.min))
    errors.push(`${name}: ${version} is below reviewed security floor ${rule.min} — ${rule.reason}`);
}
if (errors.length) {
  console.error("Dependency security floor: FAIL");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`Dependency security floor: PASS (${Object.keys(policy.packages || {}).length} reviewed packages)`);

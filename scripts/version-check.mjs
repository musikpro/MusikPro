#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { kitVersion } from "./lib/version.mjs";

const root = process.cwd();
const errors = [];
for (const rel of ["package.json", "africa-saas.config.example.json", "config/features.json"]) {
  const data = JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
  if (String(data.version) !== kitVersion) errors.push(`${rel}: version ${data.version} != ${kitVersion}`);
}
const stale = [];
for (const rel of [
  "scripts/setup-payments.mjs",
  "scripts/setup-saas-mark.mjs",
  "scripts/production-doctor.mjs",
  "scripts/seed-payment-routes.mjs",
]) {
  const text = fs.readFileSync(path.join(root, rel), "utf8");
  if (/0\.8\.(?:10|16|20)\b/.test(text)) stale.push(rel);
}
if (stale.length) errors.push(`stale hardcoded version markers: ${stale.join(", ")}`);
if (errors.length) {
  console.error("Version contract: FAIL");
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log(`Version contract: PASS (${kitVersion})`);

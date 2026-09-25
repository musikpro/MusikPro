#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
const root = process.cwd();
const cfgPath = path.join(root, "africa-saas.config.json");
if (!fs.existsSync(cfgPath)) throw new Error("Missing africa-saas.config.json. Run npm run setup first.");
const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
const m = cfg.mobileApp || {};
if (!(cfg.mobileAppEnabled === true || m.enabled === true)) {
  console.log("○ SKIPPED: mobile app is disabled.");
  process.exit(0);
}
const packages = [
  "@capacitor/core@8.5.1",
  "@capacitor/cli@8.5.1",
  ...(m.platforms || []).map((p) => `@capacitor/${p}@8.5.1`),
];
console.log(`Installing optional mobile dependencies: ${packages.join(", ")}`);
execFileSync("npm", ["install", "--save-dev", ...packages], { cwd: root, stdio: "inherit" });
console.log("✓ Optional Capacitor dependencies installed.");

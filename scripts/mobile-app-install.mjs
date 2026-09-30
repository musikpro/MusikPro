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
  console.log("○ SKIPPED: native mobile app is disabled; PWA Web remains available.");
  process.exit(0);
}
if (m.strategy !== "pwa-capacitor")
  throw new Error("Legacy mobile strategy detected. Run npm run mobile:app:migrate first.");
const runtimePackages = ["@capacitor/core@8.5.1", ...(m.platforms || []).map((p) => `@capacitor/${p}@8.5.1`)];
console.log(`Installing Capacitor runtime packages: ${runtimePackages.join(", ")}`);
execFileSync("npm", ["install", "--save", ...runtimePackages], { cwd: root, stdio: "inherit" });
console.log("Installing Capacitor CLI as a development dependency.");
execFileSync("npm", ["install", "--save-dev", "@capacitor/cli@8.5.1"], { cwd: root, stdio: "inherit" });
console.log("✓ Capacitor dependencies installed for the PWA wrapper pipeline.");

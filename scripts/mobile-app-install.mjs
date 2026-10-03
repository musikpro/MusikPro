#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const cfgPath = path.join(root, "africa-saas.config.json");
if (!fs.existsSync(cfgPath)) throw new Error("Missing africa-saas.config.json. Run npm run setup first.");
const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
const mobile = cfg.mobileApp || {};
if (!(cfg.mobileAppEnabled === true || mobile.enabled === true)) {
  console.log("○ SKIPPED: native mobile app is disabled; PWA Web remains available.");
  process.exit(0);
}
if (mobile.strategy !== "pwa-capacitor")
  throw new Error(
    'Unsupported mobile strategy. Africa SaaS Kit accepts only mobileApp.strategy="pwa-capacitor". Re-run npm run mobile:app:configure.',
  );

const contract = JSON.parse(fs.readFileSync(path.join(root, "config/mobile-dependencies.json"), "utf8"));
const [nodeMajor] = process.versions.node.split(".").map(Number);
if (nodeMajor < contract.minimumNodeMajor)
  throw new Error(
    `Capacitor ${contract.capacitorVersion} requires Node.js ${contract.minimumNodeMajor}+ for native development. Active: ${process.versions.node}.`,
  );

execFileSync(process.execPath, [path.join(root, "scripts/npm-registry-check.mjs")], { cwd: root, stdio: "inherit" });
const version = contract.capacitorVersion;
const runtimePackages = [
  `@capacitor/core@${version}`,
  ...(mobile.platforms || []).map((platform) => `@capacitor/${platform}@${version}`),
];
console.log(`Installing Capacitor runtime packages: ${runtimePackages.join(", ")}`);
execFileSync("npm", ["install", "--save", ...runtimePackages], { cwd: root, stdio: "inherit" });
console.log(`Installing Capacitor CLI ${version} as a development dependency.`);
execFileSync("npm", ["install", "--save-dev", `@capacitor/cli@${version}`], { cwd: root, stdio: "inherit" });
console.log("✓ Capacitor dependencies installed for the PWA wrapper pipeline.");
console.log(
  "Next: npm run mobile:app:prepare, then npm run mobile:app:check. Before any store submission, run npm run mobile:store-check.",
);

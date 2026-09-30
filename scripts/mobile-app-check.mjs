#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
const root = process.cwd();
const read = (rel) => {
  try {
    return fs.readFileSync(path.join(root, rel), "utf8");
  } catch {
    return "";
  }
};
const readJson = (rel) => {
  try {
    return JSON.parse(read(rel));
  } catch {
    return null;
  }
};
const cfg = readJson("africa-saas.config.json") || readJson("africa-saas.config.example.json") || {};
const enabled = cfg.mobileAppEnabled === true || cfg.mobileApp?.enabled === true;
const m = cfg.mobileApp || {};
const checks = [];
const add = (id, ok, detail) => checks.push({ id, ok, detail });
add(
  "zod-gate",
  fs.existsSync(path.join(root, "scripts/zod-validation-check.mjs")),
  "Zod server validation gate available",
);
add(
  "security-gate",
  fs.existsSync(path.join(root, "scripts/security-baseline-check.mjs")),
  "Security baseline available",
);
add(
  "web-mobile-gate",
  fs.existsSync(path.join(root, "scripts/mobile-first-check.mjs")),
  "Responsive Web mobile-first gate available",
);
add(
  "pipeline-doc",
  /PWA \+ Capacitor/.test(read("docs/mobile/mobile-app-pipeline.md")),
  "PWA + Capacitor pipeline guide present",
);
add(
  "official-skill",
  fs.existsSync(path.join(root, ".agents/skills/mobile-app-pwa-capacitor/SKILL.md")),
  "Official mobile PWA + Capacitor skill present",
);
add(
  "native-runtime",
  fs.existsSync(path.join(root, "lib/mobile/native-runtime.ts")) &&
    /mobileRuntimeContext/.test(read("lib/mobile/native-runtime.ts")),
  "Centralized Web/PWA/Android/iOS runtime helper present",
);
add(
  "nav-separation",
  /WebOnly/.test(read("components/mobile-bottom-nav.tsx")) &&
    /NativeOnly/.test(read("components/mobile/native-bottom-nav.tsx")),
  "Web-mobile and native bottom navigation are isolated",
);
const pwa = spawnSync(process.execPath, [path.join(root, "scripts/pwa-check.mjs")], { cwd: root, encoding: "utf8" });
add("pwa-check", pwa.status === 0, "PWA manifest/service worker/cache/no-static-export checks pass");
console.log("Africa SaaS Kit — PWA + Capacitor Mobile App Check");
for (const c of checks) console.log(`${c.ok ? "✓" : "✗"} ${c.id}: ${c.detail}`);
const baseFailed = checks.filter((c) => !c.ok);
if (baseFailed.length) {
  console.error(`\n${baseFailed.length} mobile architecture check(s) FAIL.`);
  process.exit(1);
}
if (!enabled) {
  console.log("\n○ SKIPPED: native Android/iOS wrapper is optional and disabled.");
  console.log("✓ PWA/Web readiness remains validated and the desktop build is unaffected.");
  process.exit(0);
}
const opt = [];
const addOpt = (id, ok, detail) => opt.push({ id, ok, detail });
addOpt(
  "strategy",
  m.strategy === "pwa-capacitor",
  "Official pwa-capacitor strategy selected; legacy WebView modes are deprecated",
);
addOpt(
  "app-id",
  /^[a-zA-Z][a-zA-Z0-9]*(\.[a-zA-Z][a-zA-Z0-9_-]*){1,}$/.test(String(m.appId || "")),
  "Reverse-domain application id",
);
addOpt("https-url", /^https:\/\//.test(String(m.productionUrl || "")), "Hosted Next.js/PWA URL uses HTTPS");
addOpt(
  "platforms",
  Array.isArray(m.platforms) && m.platforms.length > 0 && m.platforms.every((p) => ["android", "ios"].includes(p)),
  "Android/iOS platform selection",
);
const pkg = readJson("package.json") || {};
const all = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
const capInstalled = ["@capacitor/core", "@capacitor/cli"].every((x) => all[x]);
addOpt("capacitor-installed", capInstalled, "Capacitor core + CLI installed after opt-in");
if (capInstalled) {
  if ((m.platforms || []).includes("android"))
    addOpt("capacitor-android", Boolean(all["@capacitor/android"]), "Android package installed");
  if ((m.platforms || []).includes("ios"))
    addOpt("capacitor-ios", Boolean(all["@capacitor/ios"]), "iOS package installed");
  const cap = read("capacitor.config.ts");
  addOpt(
    "capacitor-config",
    /webDir:\s*["']mobile-shell["']/.test(cap) && /server:\s*\{/.test(cap),
    "Capacitor wrapper config generated without static-export webDir",
  );
}
for (const c of opt) console.log(`${c.ok ? "✓" : "✗"} ${c.id}: ${c.detail}`);
const failed = opt.filter((c) => !c.ok);
if (failed.length) {
  console.error(`\n${failed.length} mobile app opt-in check(s) FAIL.`);
  process.exit(1);
}
console.log(
  "\nPWA + Capacitor Mobile App Pipeline: structurally ready; native builds still require Android Studio/Xcode validation.",
);

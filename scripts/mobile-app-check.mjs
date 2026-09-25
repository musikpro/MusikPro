#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const readJson = (rel) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
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
  fs.existsSync(path.join(root, "docs/mobile/mobile-app-pipeline.md")),
  "WebView mobile pipeline guide present",
);
add(
  "native-runtime",
  fs.existsSync(path.join(root, "lib/mobile/native-runtime.ts")) &&
    fs.existsSync(path.join(root, "components/mobile/native-only.tsx")) &&
    fs.existsSync(path.join(root, "components/mobile/web-only.tsx")),
  "Native/Web runtime boundaries present",
);
add(
  "native-nav",
  fs.existsSync(path.join(root, "components/mobile/native-bottom-nav.tsx")),
  "Optional app-only bottom navigation available",
);
const webNavPath = path.join(root, "components/mobile-bottom-nav.tsx");
const webNav = fs.existsSync(webNavPath) ? fs.readFileSync(webNavPath, "utf8") : "";
add("web-native-nav-separation", webNav.includes("WebOnly"), "Web navigation is hidden inside Capacitor runtime");

console.log("Africa SaaS Kit — WebView Mobile App Check");
for (const c of checks) console.log(`${c.ok ? "✓" : "✗"} ${c.id}: ${c.detail}`);
const baseFailed = checks.filter((c) => !c.ok);
if (baseFailed.length) {
  console.error(`\n${baseFailed.length} mobile architecture check(s) FAIL.`);
  process.exit(1);
}

if (!enabled) {
  console.log("\n○ SKIPPED: Android/iPhone WebView app is optional and disabled.");
  console.log("✓ Web build and Web readiness score are not affected.");
  process.exit(0);
}

const opt = [];
const addOpt = (id, ok, detail) => opt.push({ id, ok, detail });
addOpt(
  "strategy",
  ["webview-hosted", "hosted-nextjs"].includes(String(m.strategy || "")),
  "Hosted WebView strategy selected",
);
addOpt(
  "app-id",
  /^[a-zA-Z][a-zA-Z0-9]*(\.[a-zA-Z][a-zA-Z0-9_-]*){1,}$/.test(String(m.appId || "")),
  "Reverse-domain application id",
);
addOpt("https-url", /^https:\/\//.test(String(m.productionUrl || "")), "Production SaaS URL uses HTTPS");
addOpt(
  "platforms",
  Array.isArray(m.platforms) && m.platforms.length > 0 && m.platforms.every((p) => ["android", "ios"].includes(p)),
  "Android/iOS platform selection",
);
const pkg = readJson("package.json") || {};
const all = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
const capInstalled = ["@capacitor/core", "@capacitor/cli"].every((x) => all[x]);
addOpt("capacitor-installed", capInstalled, "Capacitor dependencies installed only after opt-in");
if (capInstalled) {
  if ((m.platforms || []).includes("android"))
    addOpt("capacitor-android", Boolean(all["@capacitor/android"]), "Android package installed");
  if ((m.platforms || []).includes("ios"))
    addOpt("capacitor-ios", Boolean(all["@capacitor/ios"]), "iOS package installed");
  addOpt(
    "capacitor-config",
    fs.existsSync(path.join(root, "capacitor.config.ts")),
    "Capacitor WebView config generated",
  );
}
for (const c of opt) console.log(`${c.ok ? "✓" : "✗"} ${c.id}: ${c.detail}`);
const failed = opt.filter((c) => !c.ok);
if (failed.length) {
  console.error(`\n${failed.length} mobile app opt-in check(s) FAIL.`);
  process.exit(1);
}
console.log("\nWebView Mobile App Pipeline: ready for native project testing.");

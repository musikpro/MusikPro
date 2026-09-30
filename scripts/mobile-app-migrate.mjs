#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
const root = process.cwd();
const cfgPath = path.join(root, "africa-saas.config.json");
if (!fs.existsSync(cfgPath)) {
  console.log("○ No africa-saas.config.json found; nothing to migrate.");
  process.exit(0);
}
const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
const mobile = cfg.mobileApp || {};
const legacy = ["webview-hosted", "hosted-nextjs"].includes(String(mobile.strategy || ""));
if (!legacy) {
  console.log(`✓ Mobile strategy already ${mobile.strategy || "unset"}; no legacy WebView migration required.`);
  process.exit(0);
}
cfg.mobileApp = {
  ...mobile,
  strategy: "pwa-capacitor",
  prepared: false,
  migratedFrom: mobile.strategy,
  migratedAt: new Date().toISOString(),
};
fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + "\n", { mode: 0o600 });
console.log(`✓ Legacy strategy ${mobile.strategy} migrated to pwa-capacitor.`);
console.log(
  "Existing android/ios directories were preserved. Re-run mobile:pwa:check, mobile:app:install and mobile:app:prepare before native validation.",
);

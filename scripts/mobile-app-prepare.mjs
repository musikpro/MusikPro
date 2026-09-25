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
  console.log(
    "○ WebView Mobile App Pipeline disabled. Nothing changed. Enable with npm run mobile:app:configure -- --app-id=com.example.app --url=https://example.com",
  );
  process.exit(0);
}
if (!/^https:\/\//.test(String(m.productionUrl || ""))) throw new Error("mobileApp.productionUrl must be HTTPS.");
const pkgPath = path.join(root, "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
if (!deps["@capacitor/core"] || !deps["@capacitor/cli"])
  throw new Error("Capacitor is not installed. Run npm run mobile:app:install first.");
const config = `import type { CapacitorConfig } from '@capacitor/cli';\n\nconst config: CapacitorConfig = {\n  appId: ${JSON.stringify(m.appId)},\n  appName: ${JSON.stringify(m.appName || cfg.appName)},\n  webDir: 'mobile-shell',\n  server: {\n    url: ${JSON.stringify(m.productionUrl)},\n    cleartext: false,\n    allowNavigation: [${JSON.stringify(new URL(m.productionUrl).hostname)}],\n  },\n};\n\nexport default config;\n`;
fs.writeFileSync(path.join(root, "capacitor.config.ts"), config);
fs.mkdirSync(path.join(root, "mobile-shell"), { recursive: true });
fs.writeFileSync(
  path.join(root, "mobile-shell/index.html"),
  '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Mobile shell</title></head><body><noscript>This app requires JavaScript.</noscript></body></html>\n',
);
for (const platform of m.platforms || []) {
  if (!fs.existsSync(path.join(root, platform))) {
    console.log(`Adding Capacitor platform: ${platform}`);
    execFileSync(process.execPath, [path.join(root, "node_modules/@capacitor/cli/bin/capacitor"), "add", platform], {
      cwd: root,
      stdio: "inherit",
    });
  }
}
execFileSync(process.execPath, [path.join(root, "node_modules/@capacitor/cli/bin/capacitor"), "sync"], {
  cwd: root,
  stdio: "inherit",
});
cfg.mobileApp = { ...m, enabled: true, prepared: true, preparedAt: new Date().toISOString() };
cfg.mobileAppEnabled = true;
fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + "\n", { mode: 0o600 });
console.log(
  "✓ Android/iOS WebView project files prepared. The app loads the hosted SaaS URL; Web source was not modified.",
);
console.log("Review docs/mobile/mobile-app-pipeline.md before store builds.");

#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
const root = process.cwd();
const cfgPath = path.join(root, "africa-saas.config.json");
if (!fs.existsSync(cfgPath)) throw new Error("Missing africa-saas.config.json. Run npm run setup first.");
const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
const m = cfg.mobileApp || {};
const contract = JSON.parse(fs.readFileSync(path.join(root, "config/mobile-dependencies.json"), "utf8"));
const [nodeMajor] = process.versions.node.split(".").map(Number);
if (nodeMajor < contract.minimumNodeMajor)
  throw new Error(
    `Capacitor ${contract.capacitorVersion} requires Node.js ${contract.minimumNodeMajor}+ for native development. Active: ${process.versions.node}.`,
  );
if (!(cfg.mobileAppEnabled === true || m.enabled === true)) {
  console.log("○ PWA + Capacitor native pipeline disabled. The Web/PWA project remains unchanged.");
  process.exit(0);
}
if (m.strategy !== "pwa-capacitor")
  throw new Error(
    'Unsupported mobile strategy. Africa SaaS Kit accepts only mobileApp.strategy="pwa-capacitor". Re-run npm run mobile:app:configure.',
  );
if (!/^https:\/\//.test(String(m.productionUrl || ""))) throw new Error("mobileApp.productionUrl must be HTTPS.");
execFileSync(process.execPath, [path.join(root, "scripts/pwa-check.mjs")], { cwd: root, stdio: "inherit" });
const pkgPath = path.join(root, "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
if (!deps["@capacitor/core"] || !deps["@capacitor/cli"])
  throw new Error("Capacitor is not installed. Run npm run mobile:app:install first.");
const host = new URL(m.productionUrl).hostname;
const config = `import type { CapacitorConfig } from '@capacitor/cli';\n\nconst config: CapacitorConfig = {\n  appId: ${JSON.stringify(m.appId)},\n  appName: ${JSON.stringify(m.appName || cfg.appName)},\n  webDir: 'mobile-shell',\n  server: {\n    url: ${JSON.stringify(m.productionUrl)},\n    cleartext: false,\n    allowNavigation: [${JSON.stringify(host)}],\n  },\n};\n\nexport default config;\n`;
fs.writeFileSync(path.join(root, "capacitor.config.ts"), config);
fs.mkdirSync(path.join(root, "mobile-shell"), { recursive: true });
fs.writeFileSync(
  path.join(root, "mobile-shell/index.html"),
  '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Capacitor bootstrap</title></head><body><noscript>This wrapper requires JavaScript and the hosted Next.js PWA.</noscript></body></html>\n',
);
for (const platform of m.platforms || []) {
  if (!deps[`@capacitor/${platform}`])
    throw new Error(`Missing @capacitor/${platform}. Run npm run mobile:app:install.`);
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
cfg.mobileApp = {
  ...m,
  enabled: true,
  strategy: "pwa-capacitor",
  prepared: true,
  preparedMode: "development-remote",
  storeReady: false,
  preparedAt: new Date().toISOString(),
};
cfg.mobileAppEnabled = true;
fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + "\n", { mode: 0o600 });
console.log(
  "✓ PWA + Capacitor projects prepared for development/structural validation. Next.js remains server-rendered; no static export was introduced.",
);
console.warn(
  "⚠ capacitor.config.ts uses server.url for the hosted SaaS. Capacitor documents this as a live-reload/development pattern, not a production-store configuration.",
);
console.log(
  "Review docs/mobile/mobile-app-pipeline.md and run npm run mobile:store-check before any Play Store/App Store certification.",
);

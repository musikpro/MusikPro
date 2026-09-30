#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const cfgPath = path.join(root, "africa-saas.config.json");
if (!fs.existsSync(cfgPath)) throw new Error("Missing africa-saas.config.json. Run npm run setup first.");
const config = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
const args = process.argv.slice(2);
const get = (name) => {
  const inline = args.find((arg) => arg.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};
const write = () => fs.writeFileSync(cfgPath, JSON.stringify(config, null, 2) + "\n", { mode: 0o600 });

if (args.includes("--none")) {
  config.mobileAppEnabled = false;
  config.mobileApp = { ...(config.mobileApp || {}), enabled: false, strategy: "pwa-capacitor", prepared: false };
  write();
  console.log("✓ Mobile App Pipeline natif désactivé. La PWA Web et le SaaS Next.js restent disponibles.");
  process.exit(0);
}

const appId = get("--app-id") || config.mobileApp?.appId;
const appName = get("--app-name") || config.mobileApp?.appName || config.appName;
const productionUrl = get("--url") || config.mobileApp?.productionUrl || config.appUrl;
const platforms = (get("--platforms") || (config.mobileApp?.platforms || ["android", "ios"]).join(","))
  .split(",")
  .map((v) => v.trim())
  .filter(Boolean);
if (!/^[a-zA-Z][a-zA-Z0-9]*(\.[a-zA-Z][a-zA-Z0-9_-]*){1,}$/.test(String(appId || "")))
  throw new Error("--app-id must be a reverse-domain id, e.g. com.company.app");
if (!/^https:\/\//.test(String(productionUrl || "")))
  throw new Error("--url must be the HTTPS production URL of the Next.js SaaS/PWA.");
if (!platforms.length || platforms.some((p) => !["android", "ios"].includes(p)))
  throw new Error("--platforms must contain android and/or ios.");

config.mobileAppEnabled = true;
config.mobileApp = {
  ...(config.mobileApp || {}),
  enabled: true,
  appId,
  appName,
  productionUrl: productionUrl.replace(/\/$/, ""),
  platforms: [...new Set(platforms)],
  strategy: "pwa-capacitor",
  bottomNavigation: config.mobileApp?.bottomNavigation !== false,
  prepared: false,
};
write();
console.log(`✓ Mobile App Pipeline PWA + Capacitor activé pour ${config.mobileApp.platforms.join(" + ")}.`);
console.log(`✓ PWA/Next.js serveur: ${config.mobileApp.productionUrl}`);
console.log("Next: npm run mobile:pwa:check && npm run mobile:app:install && npm run mobile:app:prepare");

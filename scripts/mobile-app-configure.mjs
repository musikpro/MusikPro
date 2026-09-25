#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const configPath = path.join(root, "africa-saas.config.json");
const args = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith("--"))
    .map((a) => {
      const [k, ...r] = a.slice(2).split("=");
      return [k, r.length ? r.join("=") : true];
    }),
);
if (!fs.existsSync(configPath)) throw new Error("Missing africa-saas.config.json. Run npm run setup first.");
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const write = () => fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", { mode: 0o600 });

if (args.none || args.disable) {
  config.mobileAppEnabled = false;
  config.mobileApp = { ...(config.mobileApp || {}), enabled: false };
  write();
  console.log("✓ Mobile App Pipeline disabled. Web SaaS remains unchanged.");
  process.exit(0);
}

const appId = String(args["app-id"] || config.mobileApp?.appId || "").trim();
const appName = String(args["app-name"] || config.mobileApp?.appName || config.appName || "").trim();
const productionUrl = String(
  args.url ||
    config.mobileApp?.productionUrl ||
    (String(config.appUrl || "").startsWith("https://") ? config.appUrl : ""),
).trim();
const platforms = String(args.platforms || (config.mobileApp?.platforms || ["android", "ios"]).join(","))
  .split(",")
  .map((x) => x.trim().toLowerCase())
  .filter(Boolean);
if (!/^[a-zA-Z][a-zA-Z0-9]*(\.[a-zA-Z][a-zA-Z0-9_-]*){1,}$/.test(appId))
  throw new Error("Provide --app-id=com.example.app (reverse-domain identifier).");
if (!appName) throw new Error("Provide --app-name=... or configure appName first.");
if (!/^https:\/\//.test(productionUrl)) throw new Error("Provide the deployed HTTPS SaaS URL with --url=https://...");
if (!platforms.length || platforms.some((p) => !["android", "ios"].includes(p)))
  throw new Error("Platforms must contain android and/or ios.");

config.mobileAppEnabled = true;
config.mobileApp = {
  enabled: true,
  appId,
  appName,
  productionUrl: productionUrl.replace(/\/$/, ""),
  platforms: [...new Set(platforms)],
  strategy: "webview-hosted",
  bottomNavigation: config.mobileApp?.bottomNavigation !== false,
  prepared: false,
};
write();
console.log(`✓ Mobile App Pipeline WebView enabled for ${config.mobileApp.platforms.join(" + ")}.`);
console.log(`✓ Hosted SaaS: ${config.mobileApp.productionUrl}`);
console.log("Next: npm run mobile:app:prepare");

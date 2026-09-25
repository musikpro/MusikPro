import fs from "node:fs";
import path from "node:path";
const root = process.cwd();
const configPath = path.join(root, "africa-saas.config.json");
if (!fs.existsSync(configPath)) throw new Error("Missing africa-saas.config.json. Run npm run setup first.");
const c = JSON.parse(fs.readFileSync(configPath, "utf8"));
const countries = JSON.parse(fs.readFileSync(path.join(root, "config/countries.json"), "utf8"));
const providers = JSON.parse(fs.readFileSync(path.join(root, "config/providers.json"), "utf8"));
const errors = [];
if (!countries[c.country]) errors.push(`Unknown country ${c.country}`);
if (!["standard", "high", "maximum"].includes(c.securityLevel)) errors.push("Invalid securityLevel");
if (c.storage === "cloudflare-r2")
  errors.push("Cloudflare R2 is not implemented yet; use storage=none until the storage adapter is added");
if (!["resend", "none"].includes(c.email)) errors.push("email must be resend or none");
const emailPasswordEnabled = c.emailPasswordEnabled !== false;
if (emailPasswordEnabled && c.email !== "resend")
  errors.push("Email/password auth requires email=resend in this starter");
if (!emailPasswordEnabled && !c.googleAuth)
  errors.push("Disabling email/password auth requires Google OAuth (or another auth provider added by the project)");
const enabled = Array.isArray(c.providers) ? c.providers : [];
const paymentsEnabled = c.paymentsEnabled === true || enabled.length > 0;
if (c.upstashEnabled != null && typeof c.upstashEnabled !== "boolean")
  errors.push("upstashEnabled must be boolean when present");
if (c.mobileAppEnabled != null && typeof c.mobileAppEnabled !== "boolean")
  errors.push("mobileAppEnabled must be boolean when present");
if (c.mobileAppEnabled === true) {
  const m = c.mobileApp || {};
  if (!/^[a-zA-Z][a-zA-Z0-9]*(\.[a-zA-Z][a-zA-Z0-9_-]*){1,}$/.test(String(m.appId || "")))
    errors.push("mobileApp.appId must be a reverse-domain id when mobile is enabled");
  if (!/^https:\/\//.test(String(m.productionUrl || "")))
    errors.push("mobileApp.productionUrl must use HTTPS when mobile is enabled");
  if (
    !Array.isArray(m.platforms) ||
    m.platforms.length === 0 ||
    m.platforms.some((p) => !["android", "ios"].includes(p))
  )
    errors.push("mobileApp.platforms must contain android and/or ios");
}

for (const p of enabled) {
  if (!providers[p]) errors.push(`Unknown provider ${p}`);
  else if (["scaffold", "merchant-validation"].includes(providers[p].readiness))
    errors.push(`${p} cannot be enabled (${providers[p].readiness})`);
}
if (paymentsEnabled && enabled.length === 0) errors.push("paymentsEnabled=true requires at least one provider");
if (enabled.length > 0 && !c.defaultProvider)
  errors.push("defaultProvider is required when payment providers are enabled");
if (c.defaultProvider && !enabled.includes(c.defaultProvider)) errors.push("defaultProvider must be enabled");
if (errors.length) {
  console.error(errors.map((e) => `✗ ${e}`).join("\n"));
  process.exit(1);
}
console.log(`✓ Setup config valid: ${c.appName} / ${c.country} / ${c.currency}`);
console.log(enabled.length ? `✓ Payments enabled: ${enabled.join(", ")}` : "✓ Payments: disabled / optional");
console.log(`✓ Security: ${c.securityLevel}`);
console.log(
  c.mobileAppEnabled
    ? `✓ Mobile app: enabled (${(c.mobileApp?.platforms || []).join(", ")})`
    : "✓ Mobile app: disabled / optional",
);

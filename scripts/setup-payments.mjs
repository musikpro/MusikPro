#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { kitVersion } from "./lib/version.mjs";

const root = process.cwd();
const configPath = path.join(root, "africa-saas.config.json");
if (!fs.existsSync(configPath)) throw new Error("Run npm run setup first.");
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const countries = JSON.parse(fs.readFileSync(path.join(root, "config/countries.json"), "utf8"));
const providersCatalog = JSON.parse(fs.readFileSync(path.join(root, "config/providers.json"), "utf8"));
const args = Object.fromEntries(
  process.argv.slice(2).map((arg, i, all) => {
    if (!arg.startsWith("--")) return [arg, true];
    const [k, inline] = arg.slice(2).split("=");
    if (inline !== undefined) return [k, inline];
    const next = all[i + 1];
    return [k, next && !next.startsWith("--") ? next : true];
  }),
);
const nonInteractive = Boolean(args["non-interactive"] || args.yes);
const rl = nonInteractive ? null : readline.createInterface({ input, output });
const list = (v) =>
  String(v || "")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
async function ask(label, fallback) {
  if (!rl) return fallback;
  const v = (await rl.question(`${label}${fallback ? ` [${fallback}]` : ""}: `)).trim();
  return v || fallback;
}
function upsertEnv(key, value = "") {
  const envPath = path.join(root, ".env.local");
  let text = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, "m");
  text = re.test(text) ? text.replace(re, line) : `${text}${text.endsWith("\n") || !text ? "" : "\n"}${line}\n`;
  fs.writeFileSync(envPath, text, { mode: 0o600 });
}

try {
  console.log("\nAfrica SaaS Kit — Optional Payments Setup (Phase 17)\n");
  const wantsPayments = args.none
    ? false
    : !["no", "false", "0", "off"].includes(
        String(await ask("Does this SaaS need online payments? (yes/no)", args.enable ?? "yes")).toLowerCase(),
      );
  if (!wantsPayments) {
    config.paymentsEnabled = false;
    config.providers = [];
    config.defaultProvider = null;
    config.methods = [];
    config.version = kitVersion;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", { mode: 0o600 });
    console.log("✓ Payments disabled. This SaaS can be deployed without any payment provider.");
    console.log(
      '✓ Mark Phase 17 skipped with: npm run setup-saas:mark -- --phase=17 --status=skipped --note="SaaS sans paiements"',
    );
    process.exit(0);
  }
  const country = config.country || "CI";
  const preset = countries[country] || countries.CI;
  const recommended = (preset.recommendedProviders || []).filter(
    (p) => providersCatalog[p] && !["scaffold", "merchant-validation"].includes(providersCatalog[p].readiness),
  );
  const selected = list(args.providers || (await ask("Payment providers, comma-separated", recommended.join(","))));
  if (!selected.length) throw new Error("Choose at least one provider or answer no to disable payments.");
  for (const p of selected) {
    if (!providersCatalog[p]) throw new Error(`Unknown provider: ${p}`);
    if (["scaffold", "merchant-validation"].includes(providersCatalog[p].readiness))
      throw new Error(`${p} cannot be enabled (${providersCatalog[p].readiness})`);
  }
  const defaultProvider = String(args.default || (await ask("Default payment provider", selected[0]))).toLowerCase();
  if (!selected.includes(defaultProvider)) throw new Error("Default provider must be enabled");
  const methods = list(
    args.methods || (await ask("Payment methods, comma-separated", (preset.methods || []).join(","))),
  );
  config.version = kitVersion;
  config.paymentsEnabled = true;
  config.providers = selected;
  config.defaultProvider = defaultProvider;
  config.methods = methods;
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", { mode: 0o600 });

  upsertEnv("PAYMENT_DEFAULT_PROVIDER", defaultProvider);
  upsertEnv("PAYMENT_WEBHOOK_BASE_URL", "");
  for (const id of selected) {
    for (const name of providersCatalog[id].env || []) upsertEnv(name, "");
  }
  console.log(`✓ Payments enabled: ${selected.join(", ")}`);
  console.log("✓ Only selected provider variables were added to .env.local");
  console.log("Next:");
  console.log("1. Fill provider sandbox credentials directly in .env.local");
  console.log("2. Run npm run setup:check");
  console.log("3. Run npm run payments:routes");
  console.log("4. Test with ngrok via npm run payments:ngrok + npm run payments:local");
} finally {
  rl?.close();
}

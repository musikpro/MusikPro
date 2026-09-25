#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const configPath = path.join(root, "africa-saas.config.json");
const vercelPath = path.join(root, "vercel.json");
let config = null;
try {
  config = JSON.parse(fs.readFileSync(configPath, "utf8"));
} catch {}
const providers = Array.isArray(config?.providers) ? config.providers : [];
if (!providers.length) {
  console.log("Cron config: SKIPPED — aucun provider de paiement activé.");
  process.exit(0);
}
let vercel = {};
try {
  vercel = JSON.parse(fs.readFileSync(vercelPath, "utf8"));
} catch {}
const crons = Array.isArray(vercel.crons) ? vercel.crons.filter((c) => c?.path !== "/api/cron/reconcile-payments") : [];
crons.push({ path: "/api/cron/reconcile-payments", schedule: process.env.PAYMENT_RECONCILE_CRON || "0 * * * *" });
vercel.crons = crons;
fs.writeFileSync(vercelPath, JSON.stringify(vercel, null, 2) + "\n");
console.log("Cron config: PASS — vercel.json mis à jour pour la réconciliation des paiements.");
console.log("Vérifier que CRON_SECRET est configuré dans Vercel avant production.");

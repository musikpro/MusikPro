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

let vercel = {};
try {
  vercel = JSON.parse(fs.readFileSync(vercelPath, "utf8"));
} catch {}
let crons = Array.isArray(vercel.crons)
  ? vercel.crons.filter((c) => c?.path !== "/api/cron/reconcile-payments" && c?.path !== "/api/cron/funnel-retention")
  : [];

// Always registered — independent of any payment provider, it just purges old funnel_events rows.
crons.push({ path: "/api/cron/funnel-retention", schedule: process.env.FUNNEL_RETENTION_CRON || "0 3 * * *" });
console.log("Cron config: purge des événements d’entonnoir (180 jours) programmée.");

if (providers.length) {
  crons.push({ path: "/api/cron/reconcile-payments", schedule: process.env.PAYMENT_RECONCILE_CRON || "0 * * * *" });
  console.log("Cron config: réconciliation des paiements programmée.");
} else {
  console.log("Cron config: réconciliation des paiements SKIPPED — aucun provider de paiement activé.");
}

vercel.crons = crons;
fs.writeFileSync(vercelPath, JSON.stringify(vercel, null, 2) + "\n");
console.log("Cron config: PASS — vercel.json mis à jour.");
console.log("Vérifier que CRON_SECRET est configuré dans Vercel avant production.");

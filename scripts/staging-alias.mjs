#!/usr/bin/env node
// Re-pointe l'alias stable du staging vers une Preview (jamais Production).
// Usage : npm run staging:alias -- https://musikpro-xxxx-musik-pro.vercel.app
import { spawnSync } from "node:child_process";

const ALIAS = process.env.STAGING_ALIAS_HOST || "musikpro-staging-musik-pro.vercel.app";
const target = process.argv[2];

if (!target || !/^https:\/\/[a-z0-9-]+\.vercel\.app\/?$/i.test(target)) {
  console.error("Usage : npm run staging:alias -- https://<deploiement-preview>.vercel.app");
  process.exit(1);
}

const host = new URL(target).host;
if (host === "musikpro.net" || host === ALIAS) {
  console.error("Cible refusée : indiquez l'URL d'un déploiement Preview, pas la production ni l'alias lui-même.");
  process.exit(1);
}

console.log(`Alias staging : ${ALIAS} -> ${host}`);
const r = spawnSync(process.platform === "win32" ? "npx.cmd" : "npx", ["vercel", "alias", "set", host, ALIAS], {
  stdio: "inherit",
});
process.exit(r.status ?? 1);

#!/usr/bin/env node
import fs from 'node:fs';

const examplePath = '.env.example';
const deploymentPath = 'config/deployment-env.json';
const errors = [];
const warnings = [];

if (!fs.existsSync(examplePath)) errors.push('.env.example manquant');
if (!fs.existsSync(deploymentPath)) errors.push('config/deployment-env.json manquant');
if (errors.length) {
  console.error('Env contract: FAIL');
  errors.forEach((e) => console.error(`- ${e}`));
  process.exit(1);
}

const text = fs.readFileSync(examplePath, 'utf8');
const entries = new Map();
for (const raw of text.split(/\r?\n/)) {
  const line = raw.trim();
  if (!line || line.startsWith('#')) continue;
  const idx = line.indexOf('=');
  if (idx <= 0) continue;
  const key = line.slice(0, idx).trim();
  const value = line.slice(idx + 1).trim();
  if (entries.has(key)) errors.push(`Variable dupliquée dans .env.example: ${key}`);
  entries.set(key, value);
}

const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
const providers = JSON.parse(fs.readFileSync('config/providers.json', 'utf8'));
const registryKeys = new Set();
for (const group of deployment.groups || []) {
  for (const variable of group.variables || []) {
    registryKeys.add(variable.name);
    if (!entries.has(variable.name)) errors.push(`Variable du registre absente de .env.example: ${variable.name}`);
    if (variable.sensitive && variable.name.startsWith('NEXT_PUBLIC_')) errors.push(`Secret marqué public dans le registre: ${variable.name}`);
  }
}

for (const provider of Object.values(providers || {})) {
  for (const name of provider.env || []) registryKeys.add(name);
}
for (const name of deployment.reserved || []) registryKeys.add(name);

for (const provider of Object.values(providers || {})) {
  for (const name of provider.env || []) {
    if (!entries.has(name)) errors.push(`Variable provider absente de .env.example: ${name}`);
  }
}

const publicSecretPattern = /^NEXT_PUBLIC_.*(?:SECRET|PRIVATE|TOKEN|PASSWORD|DATABASE|API_KEY)/i;
for (const [key, value] of entries) {
  if (publicSecretPattern.test(key)) errors.push(`Variable publique dangereuse: ${key}`);
  if (/^(?:sk_live_|ghp_|AIza|AKIA)/.test(value)) errors.push(`Valeur ressemblant à un secret réel dans .env.example: ${key}`);
  if (!registryKeys.has(key) && !['DATABASE_URL_DIRECT','PAYMENT_RECONCILE_CRON','NEXT_PUBLIC_APP_DESCRIPTION','NEXT_PUBLIC_APP_LANGUAGE','NEXT_PUBLIC_APP_LOCALE','CLOUDFLARE_R2_ACCOUNT_ID','CLOUDFLARE_R2_ACCESS_KEY_ID','CLOUDFLARE_R2_SECRET_ACCESS_KEY','CLOUDFLARE_R2_BUCKET','NEXT_PUBLIC_POSTHOG_KEY','INNGEST_EVENT_KEY'].includes(key)) {
    warnings.push(`Variable documentée hors registre de déploiement: ${key}`);
  }
}

if (warnings.length) warnings.forEach((w) => console.warn(`WARNING: ${w}`));
if (errors.length) {
  console.error('Env contract: FAIL');
  errors.forEach((e) => console.error(`- ${e}`));
  process.exit(1);
}
console.log(`Env contract: PASS (${entries.size} variables example, ${registryKeys.size} variables de déploiement)`);

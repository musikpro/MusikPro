#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const policyPath = path.join(root, "config/documentation-sources.json");
if (!fs.existsSync(policyPath)) {
  console.error("Documentation Freshness Gate — FAIL — config/documentation-sources.json manquant");
  process.exit(1);
}

const policy = JSON.parse(fs.readFileSync(policyPath, "utf8"));
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
const failures = [];
const now = Date.now();
let checked = 0;
let skipped = 0;

const cleanVersion = (value) => String(value || "").trim().replace(/^[~^<>=v\s]+/, "").split("-")[0];
for (const source of policy.sources || []) {
  if (!source?.id || !source?.url || !source?.reviewedAt) {
    failures.push(`entrée documentation incomplète: ${source?.id || "sans id"}`);
    continue;
  }
  if (!/^https:\/\//.test(source.url)) failures.push(`${source.id}: URL officielle HTTPS requise`);
  const installed = source.package ? deps[source.package] : null;
  if (source.package && !installed) {
    if (source.optional) { skipped += 1; continue; }
    failures.push(`${source.id}: package ${source.package} absent`);
    continue;
  }
  if (installed && source.reviewedVersion && cleanVersion(installed) !== cleanVersion(source.reviewedVersion)) {
    failures.push(`${source.id}: ${source.package}@${cleanVersion(installed)} diffère de la version documentaire revue ${source.reviewedVersion}`);
  }
  if (installed && source.expectedMajor) {
    const major = Number(cleanVersion(installed).split(".")[0]);
    if (major !== Number(source.expectedMajor)) failures.push(`${source.id}: major ${major} != documentation attendue major ${source.expectedMajor}`);
  }
  const reviewed = Date.parse(`${source.reviewedAt}T00:00:00Z`);
  if (!Number.isFinite(reviewed)) failures.push(`${source.id}: reviewedAt invalide`);
  else {
    const age = Math.floor((now - reviewed) / 86400000);
    const maxAge = Number(source.maxAgeDays ?? policy.defaultMaxAgeDays ?? 180);
    if (age > maxAge) failures.push(`${source.id}: documentation à revoir (${age} jours > ${maxAge})`);
  }
  checked += 1;
}

if (!checked) failures.push("aucune documentation structurante vérifiable");
if (failures.length) {
  console.error("Documentation Freshness Gate — FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`Documentation Freshness Gate — PASS — ${checked} source(s) revue(s), ${skipped} optionnelle(s) absente(s).`);

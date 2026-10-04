#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const exists = (rel) => fs.existsSync(path.join(root, rel));
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const failures = [];

for (const file of [
  "docs/quality/ai-development-quality.md",
  "docs/plans/README.md",
  "scripts/feature-plan.mjs",
  "config/features.json",
  "CLAUDE.md",
]) {
  if (!exists(file)) failures.push(`${file} manquant`);
}

if (exists("CLAUDE.md") && !/PLAN\s*→\s*SPEC\s*→\s*TEST\s*→\s*CODE/i.test(read("CLAUDE.md")))
  failures.push("CLAUDE.md ne contient pas la règle PLAN → SPEC → TEST → CODE");
if (exists("CLAUDE.md") && !/PLAN\s*→\s*SPEC\s*→\s*TEST\s*→\s*CODE/i.test(read("CLAUDE.md")))
  failures.push("CLAUDE.md ne contient pas la règle PLAN → SPEC → TEST → CODE");

const statePath = ".africa-saas/current-feature.json";
let active = null;
if (exists(statePath)) {
  try {
    active = JSON.parse(read(statePath));
  } catch {
    failures.push(`${statePath} illisible`);
  }
}

if (active?.plan) {
  if (!exists(active.plan)) failures.push(`plan actif introuvable : ${active.plan}`);
  else {
    const plan = read(active.plan);
    const required = [
      "## Objectif / problème",
      "## Réutilisation / anti-doublons",
      "## Périmètre",
      "## Hors périmètre",
      "## Données / migrations",
      "## API / contrats",
      "## Auth / rôles / multi-tenant",
      "## Entrées non fiables / sécurité",
      "## Plan de tests avant code",
      "## Critères d'acceptation",
      "## Plan d'implémentation",
      "## Rollback / réversibilité",
    ];
    for (const marker of required)
      if (!plan.includes(marker)) failures.push(`${active.plan}: section manquante ${marker}`);
  }
}

if (failures.length) {
  console.error("Feature Plan/SPEC Gate — FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(
  `Feature Plan/SPEC Gate — PASS${active?.plan ? ` — plan actif ${active.plan}` : " — aucun chantier majeur actif"}.`,
);

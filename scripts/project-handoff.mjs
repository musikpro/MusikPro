#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { kitVersion, kitVersionLabel } from "./lib/version.mjs";

const root = process.cwd();
const generated = path.join(root, "generated");
fs.mkdirSync(generated, { recursive: true });
const readJson = (rel, fallback = null) => {
  try { return JSON.parse(fs.readFileSync(path.join(root, rel), "utf8")); }
  catch { return fallback; }
};
const exists = (rel) => fs.existsSync(path.join(root, rel));
const config = readJson("africa-saas.config.json", null);
const features = readJson("config/features.json", { features: {} });
const currentFeature = readJson(".africa-saas/current-feature.json", null);
const integrity = readJson("generated/full-integrity-report.json", null);

const git = spawnSync("git", ["status", "--short"], { cwd: root, encoding: "utf8", timeout: 2000 });
const changed = git.status === 0
  ? String(git.stdout || "").split(/\r?\n/).filter(Boolean).map((line) => line.slice(3).trim()).filter((name) => !/(^|\/)\.env(?:\.|$)|secret|credential/i.test(name)).slice(0, 80)
  : [];

const enabledFeatures = Object.entries(features.features || {}).map(([id, item]) => ({ id, optional: Boolean(item?.optional) }));
const report = {
  version: kitVersion,
  generatedAt: new Date().toISOString(),
  configPresent: Boolean(config),
  currentFeature: currentFeature ? { slug: currentFeature.slug, plan: currentFeature.plan, status: currentFeature.status } : null,
  featureCount: enabledFeatures.length,
  integrity: integrity ? { status: integrity.status, summary: integrity.summary, generatedAt: integrity.generatedAt } : null,
  changedFiles: changed,
  nextActions: [
    currentFeature?.plan ? `Lire et respecter ${currentFeature.plan}` : "Aucun chantier majeur actif déclaré.",
    integrity?.status ? `Dernier test d'intégrité : ${integrity.status}` : "Relancer npm run kit:full-test après installation des dépendances.",
    "Lire AGENTS.md / CLAUDE.md avant modification et config/features.json avant toute feature transversale.",
  ],
};

const lines = [
  `# Africa SaaS Kit — Project Handoff`,
  ``,
  `- Version : ${kitVersionLabel}`,
  `- Généré : ${report.generatedAt}`,
  `- Configuration locale : ${report.configPresent ? "présente" : "non générée"}`,
  `- Fonctionnalités enregistrées : ${report.featureCount}`,
  ``,
  `## Chantier courant`,
  report.currentFeature ? `- ${report.currentFeature.slug} — ${report.currentFeature.status}\n- Plan : ${report.currentFeature.plan}` : `Aucun chantier majeur actif déclaré.`,
  ``,
  `## Dernier test d'intégrité`,
  report.integrity ? `- Statut : ${report.integrity.status}\n- Résumé : ${JSON.stringify(report.integrity.summary)}\n- Généré : ${report.integrity.generatedAt}` : `Aucun rapport d'intégrité généré dans cette copie.`,
  ``,
  `## Fichiers modifiés (Git, sans secrets)`,
  changed.length ? changed.map((file) => `- ${file}`).join("\n") : `Aucun fichier modifié détecté ou Git indisponible.`,
  ``,
  `## Prochaines actions`,
  ...report.nextActions.map((item) => `- ${item}`),
  ``,
  `> Ce handoff ne lit ni n'affiche les valeurs de .env.local. Il complète AGENTS.md/CLAUDE.md; il ne remplace pas les règles permanentes.`,
  ``,
];
fs.writeFileSync(path.join(generated, "project-handoff.json"), JSON.stringify(report, null, 2) + "\n");
fs.writeFileSync(path.join(generated, "project-handoff.md"), lines.join("\n"));
console.log("Project handoff généré : generated/project-handoff.md + .json");

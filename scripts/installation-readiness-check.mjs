#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { kitVersion, kitVersionLabel } from "./lib/version.mjs";

const root = process.cwd();
const generated = path.join(root, "generated");
fs.mkdirSync(generated, { recursive: true });
const exists = (rel) => fs.existsSync(path.join(root, rel));
const checks = [];
const add = (id, label, status, detail, action = "") => checks.push({ id, label, status, detail, action });

const [major, minor] = process.versions.node.split(".").map(Number);
const nodeOk = major > 20 || (major === 20 && minor >= 9);
add("node", "Node.js", nodeOk ? "PASS" : "FAIL", `Version active : ${process.versions.node} (>=20.9.0 requis).`, nodeOk ? "" : "Installer Node.js 20.9+ puis relancer npm run install:check.");

const npmResult = spawnSync("npm", ["--version"], { cwd: root, encoding: "utf8" });
const npmOk = npmResult.status === 0;
add("npm", "npm", npmOk ? "PASS" : "FAIL", npmOk ? `Version active : ${(npmResult.stdout || "").trim()}.` : "npm introuvable dans le PATH.", npmOk ? "" : "Installer npm avec Node.js.");

const gitResult = spawnSync("git", ["--version"], { cwd: root, encoding: "utf8" });
add("git", "Git", gitResult.status === 0 ? "PASS" : "WARN", gitResult.status === 0 ? (gitResult.stdout || "").trim() : "Git non détecté; utile pour GitHub et le staging.", gitResult.status === 0 ? "" : "Installer Git avant les workflows GitHub.");

add("package-json", "package.json", exists("package.json") ? "PASS" : "FAIL", exists("package.json") ? "Manifeste npm présent." : "package.json absent.", "");
add("lockfile", "Lockfile npm", exists("package-lock.json") ? "PASS" : "WARN", exists("package-lock.json") ? "package-lock.json présent; npm ci reproductible." : "package-lock.json absent dans le starter.", exists("package-lock.json") ? "" : "Lancer npm install une première fois puis conserver package-lock.json.");
add("dependencies", "Dépendances Node", exists("node_modules") ? "PASS" : "WARN", exists("node_modules") ? "node_modules présent." : "Dépendances non installées dans cette copie.", exists("node_modules") ? "" : "Lancer npm install.");
add("config", "Configuration du kit", exists("africa-saas.config.json") ? "PASS" : "WARN", exists("africa-saas.config.json") ? "africa-saas.config.json présent." : "Configuration projet non encore générée.", exists("africa-saas.config.json") ? "" : "Lancer npm run setup puis npm run setup-saas.");
add("env", "Variables locales", exists(".env.local") ? "PASS" : "WARN", exists(".env.local") ? ".env.local présent (contenu non affiché)." : ".env.local absent; normal avant le setup.", exists(".env.local") ? "" : "Lancer npm run setup pour générer le contrat local.");
add("readiness-ui", "État production / voyants", exists("config/readiness-ui.json") && exists("scripts/readiness-ui-check.mjs") && exists("components/readiness-check-card.tsx") ? "PASS" : "FAIL", "Registre, test UI et composant de voyant requis.", "");

const fail = checks.filter((c) => c.status === "FAIL");
const warn = checks.filter((c) => c.status === "WARN");
let nextAction = "npm run kit:full-test";
if (!nodeOk || !npmOk) nextAction = "Installer/corriger Node.js et npm, puis relancer npm run install:check";
else if (!exists("node_modules") || !exists("package-lock.json")) nextAction = "npm install";
else if (!exists("africa-saas.config.json") || !exists(".env.local")) nextAction = "npm run setup && npm run setup-saas";

const report = {
  version: kitVersion,
  generatedAt: new Date().toISOString(),
  status: fail.length ? "FAIL" : warn.length ? "READY_WITH_ACTIONS" : "READY",
  nextAction,
  summary: { pass: checks.filter((c) => c.status === "PASS").length, warn: warn.length, fail: fail.length },
  checks,
};
fs.writeFileSync(path.join(generated, "installation-readiness.json"), JSON.stringify(report, null, 2));
const md = [
  "# Africa SaaS Kit — Préparation installation",
  "",
  `- Version : ${kitVersionLabel}`,
  `- Statut : **${report.status}**`,
  `- Prochaine action : \`${nextAction}\``,
  "",
  "| Contrôle | Statut | Détail | Action |",
  "|---|---|---|---|",
  ...checks.map((c) => `| ${c.label} | ${c.status} | ${c.detail.replaceAll("|", "\\|")} | ${(c.action || "—").replaceAll("|", "\\|")} |`),
  "",
].join("\n");
fs.writeFileSync(path.join(generated, "installation-readiness.md"), md);

console.log(`Africa SaaS Kit ${kitVersionLabel} — Préparation installation\n`);
for (const c of checks) {
  const icon = c.status === "PASS" ? "✓" : c.status === "WARN" ? "○" : "✗";
  console.log(`${icon} ${c.label} — ${c.detail}`);
}
console.log(`\nProchaine action : ${nextAction}`);
console.log("Rapports : generated/installation-readiness.md + generated/installation-readiness.json");
if (fail.length) process.exit(1);

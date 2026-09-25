import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(root, rel));
const fail = [];

const registryPath = "config/readiness-ui.json";
if (!exists(registryPath)) fail.push(`${registryPath} manquant`);
const registry = exists(registryPath) ? JSON.parse(read(registryPath)) : { setupDashboard: [], productionDoctor: [] };

const setupSource = read("lib/setup/kit-dashboard.ts");
const doctorSource = read("scripts/production-doctor.mjs");
const setupUi = read("components/setup-saas-dashboard.tsx");
const doctorUi = read("app/admin/production-doctor/page.tsx");
const sharedCard = exists("components/readiness-check-card.tsx") ? read("components/readiness-check-card.tsx") : "";

for (const id of registry.setupDashboard || []) {
  if (!setupSource.includes(`id: "${id}"`) && !setupSource.includes(`id: '${id}'`)) {
    fail.push(`Carte setup absente des données: ${id}`);
  }
}
for (const id of registry.productionDoctor || []) {
  if (!doctorSource.includes(`add('${id}'`) && !doctorSource.includes(`add("${id}"`)) {
    fail.push(`Carte production absente du diagnostic CLI: ${id}`);
  }
}

if (!setupUi.includes("items.map") || !setupUi.includes("ReadinessCheckCard")) {
  fail.push("Le tableau État de préparation ne rend pas dynamiquement toutes les cartes via ReadinessCheckCard");
}
if (!doctorUi.includes("report.results.map") || !doctorUi.includes("ReadinessCheckCard")) {
  fail.push("État production ne rend pas dynamiquement tous les résultats CLI via ReadinessCheckCard");
}
if (!sharedCard.includes("kit-dot") || !sharedCard.includes("production-state-light")) {
  fail.push("Le composant partagé ne contient pas les deux systèmes de voyants");
}
if (!sharedCard.includes("Optionnel")) {
  fail.push("Le composant partagé ne distingue pas les contrôles optionnels");
}

if (fail.length) {
  console.error("Readiness UI check: FAIL");
  for (const item of fail) console.error(`- ${item}`);
  process.exit(1);
}

console.log(`Readiness UI check: PASS — ${registry.setupDashboard.length} cartes setup + ${registry.productionDoctor.length} cartes production garanties.`);

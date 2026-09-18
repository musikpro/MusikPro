#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { kitVersion } from "./lib/version.mjs";

const root = process.cwd();
const importPath = path.join(root, "design/banani/imported-design.json");
const normalizedPath = path.join(root, "design/banani/screens.json");
const featuresPath = path.join(root, "config/features.json");
const generatedDir = path.join(root, "generated");

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}
function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch (error) { fail(`JSON invalide: ${path.relative(root, file)} — ${error.message}`); }
}
function walk(dir, accept, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, accept, out);
    else if (accept(full)) out.push(full);
  }
  return out;
}
function routeFromPage(file) {
  let rel = path.relative(path.join(root, "app"), path.dirname(file)).replaceAll(path.sep, "/");
  rel = rel.split("/").filter((part) => !/^\(.+\)$/.test(part)).join("/");
  return rel ? `/${rel}` : "/";
}
function routeFromApi(file) {
  let rel = path.relative(path.join(root, "app"), path.dirname(file)).replaceAll(path.sep, "/");
  rel = rel.split("/").filter((part) => !/^\(.+\)$/.test(part)).join("/");
  return `/${rel}`;
}
function normalizeToken(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function screenKeywords(screen) {
  return new Set(normalizeToken(`${screen.id} ${screen.name} ${screen.route}`).split(/\s+/).filter((x) => x.length >= 4));
}

if (!fs.existsSync(importPath)) fail("design/banani/imported-design.json manquant. Exécuter /import-banani via MCP d’abord.");
const imported = readJson(importPath);
const screens = Array.isArray(imported.screens) ? imported.screens : [];
if (!screens.length) fail("Aucun écran réel dans imported-design.json.");

const featureManifest = fs.existsSync(featuresPath) ? readJson(featuresPath) : { features: {} };
const pageFiles = walk(path.join(root, "app"), (f) => /page\.tsx?$/.test(f));
const apiFiles = walk(path.join(root, "app", "api"), (f) => /route\.ts$/.test(f));
const componentFiles = walk(path.join(root, "components"), (f) => /\.(tsx|ts)$/.test(f));
const pageRoutes = new Map(pageFiles.map((f) => [routeFromPage(f), path.relative(root, f)]));
const apiRoutes = new Map(apiFiles.map((f) => [routeFromApi(f), path.relative(root, f)]));
const componentIndex = componentFiles.map((f) => ({ file: path.relative(root, f), token: normalizeToken(path.basename(f, path.extname(f))) }));

const normalizedScreens = [];
const results = [];
for (const raw of screens) {
  const screen = {
    id: raw.id || normalizeToken(raw.name).replaceAll(" ", "-") || `screen-${normalizedScreens.length + 1}`,
    name: raw.name || raw.id || `Screen ${normalizedScreens.length + 1}`,
    route: raw.route || "TBD",
    auth: raw.auth || "TBD",
    purpose: raw.purpose || "À CONFIRMER",
    states: Array.isArray(raw.states) && raw.states.length ? raw.states : ["default"],
    notes: raw.notes || "",
    viewport: raw.viewport || "TBD",
    keyElements: Array.isArray(raw.keyElements) ? raw.keyElements : [],
    interactions: Array.isArray(raw.interactions) ? raw.interactions : [],
    dataNeeds: Array.isArray(raw.dataNeeds) ? raw.dataNeeds : [],
    integrations: Array.isArray(raw.integrations) ? raw.integrations : []
  };
  normalizedScreens.push(screen);

  const existingPage = pageRoutes.get(screen.route) || null;
  const keywords = screenKeywords(screen);
  const candidates = componentIndex
    .map((c) => ({ ...c, score: [...keywords].filter((k) => c.token.includes(k) || k.includes(c.token)).length }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((c) => c.file);

  let classification = "CRÉER";
  let reason = "Aucune page existante avec cette route.";
  if (existingPage) {
    classification = screen.route === "/" && existingPage === "app/page.tsx" ? "ADAPTER" : "ADAPTER";
    reason = `La route existe déjà (${existingPage}) ; préserver la logique et adapter le rendu au design.`;
  }
  if (raw.reuse === true) {
    classification = "RÉUTILISER";
    reason = "Le snapshot Banani confirme explicitement que l’écran existant doit être conservé.";
  }
  if (screen.route === "TBD") {
    classification = "À CONFIRMER";
    reason = "La route n’a pas pu être déterminée depuis Banani.";
  }

  results.push({
    id: screen.id,
    name: screen.name,
    route: screen.route,
    classification,
    reason,
    existingPage,
    componentCandidates: candidates,
    auth: screen.auth,
    dataNeeds: screen.dataNeeds,
    interactions: screen.interactions,
    integrations: screen.integrations
  });
}

const referencedCapabilities = new Set();
for (const screen of normalizedScreens) {
  for (const v of [...screen.integrations, ...screen.dataNeeds, ...screen.interactions]) referencedCapabilities.add(normalizeToken(v));
}
const featureHints = [];
for (const [name, feature] of Object.entries(featureManifest.features || {})) {
  const haystack = normalizeToken(`${name} ${feature.description || ""}`);
  const matched = [...referencedCapabilities].some((cap) => cap && (haystack.includes(cap) || cap.includes(name)));
  if (matched) featureHints.push({ feature: name, status: "EXISTANT", description: feature.description || "" });
}

const normalized = {
  project: imported.project?.name || imported.project || "SaaS Banani",
  source: "banani-mcp",
  importedAt: imported.project?.observedAt || new Date().toISOString(),
  screens: normalizedScreens
};
fs.writeFileSync(normalizedPath, JSON.stringify(normalized, null, 2) + "\n");

const counts = Object.fromEntries(["RÉUTILISER", "ADAPTER", "CRÉER", "À CONFIRMER"].map((k) => [k, results.filter((r) => r.classification === k).length]));
const table = results.map((r, i) => `| ${i + 1} | ${r.name} | \`${r.route}\` | **${r.classification}** | ${r.existingPage ? `\`${r.existingPage}\`` : "—"} |`).join("\n");
const detail = results.map((r, i) => [
  `### ${i + 1}. ${r.name} — ${r.classification}`,
  `- Route Banani: \`${r.route}\``,
  `- Existant: ${r.existingPage ? `\`${r.existingPage}\`` : "aucune page correspondante"}`,
  `- Décision: ${r.reason}`,
  `- Composants candidats à réutiliser: ${r.componentCandidates.length ? r.componentCandidates.map((x) => `\`${x}\``).join(", ") : "aucun candidat évident"}`,
  `- Auth observée: ${r.auth}`,
  `- Données visibles: ${r.dataNeeds.length ? r.dataNeeds.join(", ") : "À CONFIRMER"}`,
  `- Interactions visibles: ${r.interactions.length ? r.interactions.join(", ") : "À CONFIRMER"}`,
  `- Intégrations visibles/confirmées: ${r.integrations.length ? r.integrations.join(", ") : "aucune / À CONFIRMER"}`,
  ""
].join("\n")).join("\n");

const md = `# Banani → Africa SaaS Kit — Gap analysis\n\n` +
`> Généré à partir du snapshot MCP Banani. Le design est une source de vérité visuelle, pas une autorisation pour inventer les règles métier.\n\n` +
`## Résumé\n- Écrans importés: ${results.length}\n- RÉUTILISER: ${counts["RÉUTILISER"]}\n- ADAPTER: ${counts["ADAPTER"]}\n- CRÉER: ${counts["CRÉER"]}\n- À CONFIRMER: ${counts["À CONFIRMER"]}\n- Pages existantes détectées: ${pageRoutes.size}\n- Routes API existantes détectées: ${apiRoutes.size}\n\n` +
`## Matrice écran → starter\n\n| # | Écran | Route | Décision | Page existante |\n|---:|---|---|---|---|\n${table}\n\n` +
`## Features existantes potentiellement concernées\n${featureHints.length ? featureHints.map((f) => `- **${f.feature}** — ${f.description}`).join("\n") : "- Aucune correspondance automatique fiable. L’IA doit consulter config/features.json avant toute création."}\n\n` +
`## Détail\n\n${detail}\n` +
`## Règles avant code\n1. Présenter cette matrice à l’utilisateur.\n2. Réutiliser ou adapter avant de créer.\n3. Toute règle métier non visible dans Banani reste **À CONFIRMER**.\n4. Exécuter \`npm run features:check\` après toute modification structurelle.\n5. Générer ensuite le plan avec \`npm run design:plan\`.\n`;

fs.mkdirSync(generatedDir, { recursive: true });
fs.writeFileSync(path.join(generatedDir, "banani-gap-analysis.md"), md);
fs.writeFileSync(path.join(generatedDir, "banani-gap-analysis.json"), JSON.stringify({
  version: kitVersion,
  generatedAt: new Date().toISOString(),
  project: normalized.project,
  counts,
  results,
  featureHints
}, null, 2));

console.log(`✓ Banani import analyzed: ${results.length} screen(s)`);
console.log(`✓ RÉUTILISER ${counts["RÉUTILISER"]} · ADAPTER ${counts["ADAPTER"]} · CRÉER ${counts["CRÉER"]} · À CONFIRMER ${counts["À CONFIRMER"]}`);
console.log("✓ generated/banani-gap-analysis.md");
console.log("✓ design/banani/screens.json synchronized");

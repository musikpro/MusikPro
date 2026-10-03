#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const roots = ["app", "components", "lib", "db/migrations"];
const extensions = new Set([".js", ".jsx", ".ts", ".tsx", ".sql"]);
// Fichiers qui doivent citer ces pictogrammes pour les interdire, ou migration historique déjà appliquée
// (corrigée par la migration suivante) : jamais d'autre exception.
const allowedFiles = new Set([
  "lib/occasion-fields/forbidden-glyphs.ts",
  "db/migrations/0062_occasion_fields.sql",
  "db/migrations/0064_remove_sparkle_glyphs.sql",
]);

const forbidden = [
  { label: "Sparkle/Sparkles component", re: /\b(?:Sparkle|Sparkles|WandSparkles|WandSparkle)\b/g },
  { label: "decorative sparkle glyph", re: /[✨✦✧✩✪✫✬✭✮✯✰🌟💫]/gu },
  // Icône référencée par son NOM (Icon i="sparkles", icon: "sparkles"…) : invisible pour la règle sur le composant.
  { label: "sparkle icon name", re: /["'`](?:sparkles?|wand-sparkles?)["'`]/gi },
  { label: "star-as-AI-decoration", re: /[★☆]/g },
];

const legacyIconProp = /\bicon\s*:\s*["'`](?:⌂|◫|◉|◇|◆|●|○|■|□)["'`]/g;
const failures = [];
let scanned = 0;

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".next", "generated"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (extensions.has(path.extname(entry.name))) inspect(full);
  }
}

function lineFor(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function inspect(file) {
  scanned += 1;
  const text = fs.readFileSync(file, "utf8");
  const rel = path.relative(root, file).split(path.sep).join("/");
  if (allowedFiles.has(rel)) return;
  for (const rule of forbidden) {
    rule.re.lastIndex = 0;
    for (const match of text.matchAll(rule.re)) {
      failures.push(`${rel}:${lineFor(text, match.index ?? 0)} — ${rule.label}: ${JSON.stringify(match[0])}`);
    }
  }
  legacyIconProp.lastIndex = 0;
  for (const match of text.matchAll(legacyIconProp)) {
    failures.push(`${rel}:${lineFor(text, match.index ?? 0)} — legacy Unicode icon: ${JSON.stringify(match[0])}`);
  }
}

for (const rel of roots) walk(path.join(root, rel));

if (failures.length) {
  console.error("Premium icon gate: FAIL");
  console.error(
    "Les icônes Sparkle/Sparklet et symboles décoratifs de style IA sont interdits dans app/, components/, lib/ et db/migrations/ (y compris par nom d'icône : \"sparkles\").",
  );
  console.error(
    "Utiliser components/ui/premium-icon.tsx ou une bibliothèque d’icônes professionnelle approuvée, avec un pictogramme sémantique adapté à l’action.",
  );
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Premium icon gate: PASS (${scanned} fichiers scannés)`);

#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
const root = process.cwd();
const file = path.join(root, "design/banani/imported-design.json");
if (!fs.existsSync(file)) {
  console.error("✗ Aucun import Banani réel. Lance /import-banani après connexion MCP.");
  process.exit(1);
}
let data;
try {
  data = JSON.parse(fs.readFileSync(file, "utf8"));
} catch (e) {
  console.error(`✗ imported-design.json invalide: ${e.message}`);
  process.exit(1);
}
if (!Array.isArray(data.screens) || !data.screens.length) {
  console.error("✗ imported-design.json ne contient aucun écran.");
  process.exit(1);
}
const raw = fs.readFileSync(file, "utf8");
if (/Bearer\s+[A-Za-z0-9._-]{12,}|bnni_[A-Za-z0-9_-]+/i.test(raw)) {
  console.error(
    "✗ Secret/token Banani détecté dans imported-design.json. Retire-le et régénère le token si nécessaire.",
  );
  process.exit(1);
}
console.log(`Import Banani preflight: PASS (${data.screens.length} écran(s))`);

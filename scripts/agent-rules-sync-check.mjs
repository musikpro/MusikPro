#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const agentsPath = path.join(root, "AGENTS.md");
const claudePath = path.join(root, "CLAUDE.md");
const start = "<!-- AGENTS_MIRROR_START -->";
const end = "<!-- AGENTS_MIRROR_END -->";
const failures = [];

if (!fs.existsSync(agentsPath)) failures.push("AGENTS.md manquant");
if (!fs.existsSync(claudePath)) failures.push("CLAUDE.md manquant");

if (!failures.length) {
  const agents = fs.readFileSync(agentsPath, "utf8").replace(/\r\n/g, "\n").trimEnd();
  const claude = fs.readFileSync(claudePath, "utf8").replace(/\r\n/g, "\n");
  const startIndex = claude.indexOf(start);
  const endIndex = claude.indexOf(end);
  if (startIndex < 0 || endIndex < 0 || endIndex <= startIndex) {
    failures.push("Bloc miroir AGENTS_MIRROR absent ou invalide dans CLAUDE.md");
  } else {
    const mirrored = claude.slice(startIndex + start.length, endIndex).trim();
    if (mirrored !== agents.trim()) {
      failures.push("CLAUDE.md ne contient pas une copie intégrale et exacte des règles de AGENTS.md");
    }
  }
  const requiredPremiumTerms = ["Sparkles", "Sparklet", "Spartlet", "WandSparkles", "ui:icons-check"];
  for (const term of requiredPremiumTerms) {
    if (!claude.includes(term)) failures.push(`CLAUDE.md — règle Premium Icon incomplète (${term} absent)`);
  }
}

if (failures.length) {
  console.error("Agent rules sync: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  console.error("Correction: exécuter npm run agents:rules-sync puis relancer npm run agents:rules-check.");
  process.exit(1);
}

const headings = (fs.readFileSync(agentsPath, "utf8").match(/^#{1,4}\s+.+$/gm) || []).length;
console.log(`Agent rules sync: PASS — AGENTS.md intégralement reflété dans CLAUDE.md (${headings} rubriques).`);

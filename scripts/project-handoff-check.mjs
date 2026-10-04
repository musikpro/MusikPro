#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const required = ["scripts/project-handoff.mjs", "docs/quality/ai-development-quality.md", "AGENTS.md", "CLAUDE.md"];
const missing = required.filter((rel) => !fs.existsSync(path.join(root, rel)));
if (missing.length) {
  console.error(`Project Handoff Gate — FAIL — manquants: ${missing.join(", ")}`);
  process.exit(1);
}
const agents = fs.readFileSync(path.join(root, "AGENTS.md"), "utf8");
const claude = fs.readFileSync(path.join(root, "CLAUDE.md"), "utf8");
if (!/project-handoff\.md/.test(agents) || !/project-handoff\.md/.test(claude)) {
  console.error("Project Handoff Gate — FAIL — règle de reprise de contexte absente d'AGENTS.md/CLAUDE.md");
  process.exit(1);
}
const report = path.join(root, "generated/project-handoff.md");
if (!fs.existsSync(report)) {
  console.log("Project Handoff Gate — PASS (structure) · WARN runtime — handoff non généré; lancer npm run context:handoff avant changement de session/agent.");
  process.exit(0);
}
const ageHours = (Date.now() - fs.statSync(report).mtimeMs) / 3600000;
console.log(`Project Handoff Gate — PASS — handoff présent (${ageHours.toFixed(1)} h).`);

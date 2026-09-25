#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const required = [
  "CLAUDE.md",
  ".claude/settings.json",
  ".claude/commands/setup-saas.md",
  ".claude/commands/security-saas.md",
  ".claude/commands/import-banani.md",
  ".claude/commands/computer-use-claude.md",
  ".agents/skills/claude-code/SKILL.md",
  ".agents/skills/computer-use-claude/SKILL.md",
];
const missing = required.filter((r) => !fs.existsSync(path.join(root, r)));
if (missing.length) {
  console.error("Claude Code prepare: FAIL");
  for (const r of missing) console.error(`- ${r} manquant`);
  process.exit(1);
}
console.log("Claude Code prepare: PASS");
console.log("- CLAUDE.md présent");
console.log("- .claude/settings.json présent (sans secret)");
console.log("- commandes Africa SaaS Kit présentes");
console.log("Étape suivante: npm run claude-code:check");

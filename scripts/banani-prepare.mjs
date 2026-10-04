#!/usr/bin/env node
import { spawnSync } from "node:child_process";

let failed = false;
function fail(msg) {
  console.error(`✗ ${msg}`);
  failed = true;
}
function pass(msg) {
  console.log(`✓ ${msg}`);
}

const claude = spawnSync("claude", ["--version"], { cwd: process.cwd(), encoding: "utf8" });
if (claude.status === 0) pass(`Claude Code détecté${claude.stdout?.trim() ? ` (${claude.stdout.trim()})` : ""}`);
else
  fail("Claude Code n'est pas détecté. Banani MCP / Implementation Planner se configure uniquement dans Claude Code.");

console.log("\nBanani MCP / Implementation Planner — Claude Code uniquement");
console.log("1. Ouvre un terminal à la racine de ce projet.");
console.log("2. Récupère ton token Banani depuis ton compte Banani (ne le colle jamais dans le chat ou Git).");
console.log("3. Exécute MANUELLEMENT dans le terminal :");
console.log(
  '   claude mcp add --transport http banani --scope local https://app.banani.co/api/mcp/mcp --header "Authorization: Bearer <TON_TOKEN_BANANI>"',
);
console.log("4. Dans Claude Code, ouvre /mcp et confirme que banani est connecté.");
console.log("5. Exécute : npm run banani:check");
console.log("6. Lance ensuite /import-banani depuis Claude Code.");
console.log(
  "\nNote : --scope local stocke la configuration dans ~/.claude.json pour ce projet. Aucun token Banani ne doit être ajouté à .mcp.json ou au dépôt.",
);

if (failed) process.exit(1);

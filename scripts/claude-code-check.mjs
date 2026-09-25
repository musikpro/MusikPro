#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

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
let settingsOk = false;
try {
  const settings = JSON.parse(fs.readFileSync(path.join(root, ".claude/settings.json"), "utf8"));
  settingsOk = Boolean(settings && typeof settings === "object");
} catch {}
const cli = spawnSync("claude", ["--version"], { encoding: "utf8", timeout: 1800 });
const cliDetected = cli.status === 0;
console.log("Africa SaaS Kit — Claude Code compatibility");
console.log(`- Fichiers projet: ${missing.length ? "FAIL" : "PASS"}`);
console.log(`- settings.json: ${settingsOk ? "PASS" : "FAIL"}`);
console.log(
  `- CLI claude: ${
    cliDetected
      ? `détecté (${String(cli.stdout || cli.stderr)
          .trim()
          .slice(0, 120)})`
      : "non détecté dans ce shell"
  }`,
);
if (missing.length || !settingsOk) {
  for (const r of missing) console.error(`- missing: ${r}`);
  process.exit(1);
}
if (!cliDetected)
  console.log(
    "- INFO: le kit est compatible Claude Code, mais le CLI n'est pas détecté sur cette machine. Installez/ouvrez Claude Code puis relancez ce contrôle.",
  );
console.log("Claude Code integration: PASS");

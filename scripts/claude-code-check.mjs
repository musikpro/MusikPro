#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const required = [
  "CLAUDE.md",
  ".claude/settings.json",
  ".claude/README.md",
  ".claude/commands/setup-saas.md",
  ".claude/commands/security-saas.md",
  ".claude/commands/import-banani.md",
  ".claude/commands/computer-use-claude.md",
  ".claude/skills/setup-saas/SKILL.md",
  ".claude/skills/security-saas/SKILL.md",
  ".claude/skills/import-banani/SKILL.md",
  ".claude/skills/claude-code/SKILL.md",
  ".claude/skills/computer-use-claude/SKILL.md",
];
const missing = required.filter((r) => !fs.existsSync(path.join(root, r)));
let settingsOk = false;
try {
  const settings = JSON.parse(fs.readFileSync(path.join(root, ".claude/settings.json"), "utf8"));
  settingsOk = Boolean(settings && typeof settings === "object");
} catch {}
let rulesOk = false;
try {
  const rules = fs.readFileSync(path.join(root, "CLAUDE.md"), "utf8");
  rulesOk =
    /source de vérité unique/i.test(rules) &&
    /refactorisation propre/i.test(rules) &&
    /PLAN\s*→\s*SPEC\s*→\s*TEST\s*→\s*CODE/i.test(rules);
} catch {}

// Architecture Claude-only : aucun AGENTS.md, .codex/, .agents/ ni skills/ racine ne doit être SUIVI par Git.
// (Un `.codex/config.toml` local ignoré par Git peut subsister sur une machine : il n'est pas versionné.)
const forbiddenLegacyPaths = ["AGENTS.md", ".codex", ".agents", "skills"];
const tracked = spawnSync("git", ["ls-files", "--", ...forbiddenLegacyPaths], { cwd: root, encoding: "utf8" });
const trackedLegacy = tracked.status === 0 ? tracked.stdout.split(/\r?\n/).filter(Boolean) : [];
const untrackedLegacy =
  tracked.status === 0 ? [] : forbiddenLegacyPaths.filter((r) => fs.existsSync(path.join(root, r)));
const legacyPresent = [...trackedLegacy, ...untrackedLegacy];

let providerRegistryOk = true;
try {
  const registry = JSON.parse(fs.readFileSync(path.join(root, "config/provider-skills.json"), "utf8"));
  for (const item of Object.values(registry)) {
    const paths = [item?.skill, ...(Array.isArray(item?.references) ? item.references : [])].filter(Boolean);
    for (const rel of paths) {
      if (rel.includes("skills/providers/") && !rel.startsWith(".claude/skills/providers/")) providerRegistryOk = false;
      if (rel.startsWith("skills/")) providerRegistryOk = false;
    }
  }
} catch {
  providerRegistryOk = false;
}

const cli = spawnSync("claude", ["--version"], { encoding: "utf8", timeout: 1800 });
const cliDetected = cli.status === 0;
console.log("Africa SaaS Kit — Claude Code");
console.log(`- Fichiers projet: ${missing.length ? "FAIL" : "PASS"}`);
console.log(`- settings.json: ${settingsOk ? "PASS" : "FAIL"}`);
console.log(`- Règles CLAUDE.md: ${rulesOk ? "PASS" : "FAIL"}`);
console.log(`- Architecture Claude-only: ${legacyPresent.length === 0 && providerRegistryOk ? "PASS" : "FAIL"}`);
console.log(
  `- CLI claude: ${
    cliDetected
      ? `détecté (${String(cli.stdout || cli.stderr)
          .trim()
          .slice(0, 120)})`
      : "non détecté dans ce shell"
  }`,
);
if (missing.length || !settingsOk || !rulesOk || legacyPresent.length || !providerRegistryOk) {
  for (const r of missing) console.error(`- missing: ${r}`);
  for (const r of legacyPresent) console.error(`- legacy path interdit: ${r}`);
  if (!providerRegistryOk)
    console.error("- provider skills registry must point only to .claude/skills/providers/* for agent skills");
  process.exit(1);
}
if (!cliDetected)
  console.log("- INFO: les fichiers Claude Code sont prêts, mais le CLI n'est pas détecté sur cette machine.");
console.log("Claude Code integration: PASS");

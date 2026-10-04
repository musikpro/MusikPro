#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const policyPath = path.join(root, "config/agent-command-policy.json");
if (!fs.existsSync(policyPath)) {
  console.error("Agent Safety Gate — FAIL — config/agent-command-policy.json manquant");
  process.exit(1);
}
const policy = JSON.parse(fs.readFileSync(policyPath, "utf8"));
const failures = [];
for (const file of ["AGENTS.md", "CLAUDE.md", "docs/security/agent-safety.md"]) {
  if (!fs.existsSync(path.join(root, file))) failures.push(`${file} manquant`);
}
for (const file of ["AGENTS.md", "CLAUDE.md"]) {
  if (!fs.existsSync(path.join(root, file))) continue;
  const source = fs.readFileSync(path.join(root, file), "utf8");
  for (const marker of ["Agent Safety Gate", "git reset --hard", "DROP TABLE", "sandbox → live", ".env.local"]) {
    if (!source.includes(marker)) failures.push(`${file}: règle manquante « ${marker} »`);
  }
}

const executable = [];
const walk = (dir) => {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(?:mjs|cjs|js|sh)$/.test(entry.name)) executable.push(full);
  }
};
walk(path.join(root, "scripts"));
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const sources = executable.filter((file) => path.relative(root, file).replaceAll("\\", "/") !== "scripts/agent-safety-check.mjs").map((file) => [path.relative(root, file), fs.readFileSync(file, "utf8")]);
sources.push(["package.json#scripts", Object.values(pkg.scripts || {}).join("\n")]);
for (const raw of policy.forbiddenExecutablePatterns || []) {
  const re = new RegExp(raw, "i");
  for (const [file, source] of sources) {
    if (re.test(source)) failures.push(`${file}: motif destructif exécutable détecté (${raw})`);
  }
}

if (failures.length) {
  console.error("Agent Safety Gate — FAIL");
  for (const failure of [...new Set(failures)]) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`Agent Safety Gate — PASS — règles persistantes + ${sources.length} source(s) exécutables inspectées.`);

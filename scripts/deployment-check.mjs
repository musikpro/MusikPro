import fs from "node:fs";
const req = [
  "config/deployment-env.json",
  "scripts/deployment-handoff.mjs",
  "docs/deployment/vercel-github-handoff.md",
  "docs/deployment/staging-vercel.md",
  "scripts/staging-check.mjs",
  "scripts/production-release-gate.mjs",
  "AGENTS.md",
  ".env.example",
];
let failed = false;
for (const f of req) {
  if (!fs.existsSync(f)) {
    console.error("FAIL missing:", f);
    failed = true;
  } else console.log("PASS", f);
}
const agents = fs.readFileSync("AGENTS.md", "utf8");
for (const marker of ["Deployment Handoff Gate", "deploy:handoff", "Ne demande jamais"]) {
  if (!agents.includes(marker)) {
    console.error("FAIL AGENTS marker:", marker);
    failed = true;
  }
}
if (failed) process.exit(1);
console.log("Deployment handoff preflight: passed.");

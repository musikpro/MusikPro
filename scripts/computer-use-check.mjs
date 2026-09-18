#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const stateFile = path.join(root, ".africa-saas/computer-use.json");
const docsOk = fs.existsSync(path.join(root, "docs/computer-use/antigravity-browser.md"));
const skillOk = fs.existsSync(path.join(root, ".agents/skills/computer-use/SKILL.md"));
let state = null;
try { state = JSON.parse(fs.readFileSync(stateFile, "utf8")); } catch {}

const chromeCandidates = process.platform === "darwin"
  ? ["/Applications/Google Chrome.app", `${process.env.HOME || ""}/Applications/Google Chrome.app`]
  : [];
const chromeHint = chromeCandidates.length ? chromeCandidates.some((p) => fs.existsSync(p)) : null;
const verified = state?.status === "verified";

console.log("Africa SaaS Kit — Computer Use / Browser Tools");
console.log(`- Skill: ${skillOk ? "PASS" : "FAIL"}`);
console.log(`- Guide: ${docsOk ? "PASS" : "FAIL"}`);
if (chromeHint === true) console.log("- Chrome local: détecté");
else if (chromeHint === false) console.log("- Chrome local: non détecté dans les emplacements macOS standards (indice seulement)");
else console.log("- Chrome local: vérification automatique non disponible sur cette plateforme");
console.log(`- Vérification Browser Subagent: ${verified ? "VERIFIED" : "UNVERIFIED"}`);
if (verified) {
  console.log(`- Preuve: ${String(state.evidence || "test navigateur confirmé").slice(0, 180)}`);
  console.log(`- Vérifié le: ${state.verifiedAt || "date inconnue"}`);
  process.exit(0);
}
console.log("\nAction requise dans Antigravity:");
console.log("1. Settings → Browser → vérifier que Browser Tools sont activés.");
console.log("2. Demander au Browser Subagent d\'ouvrir https://www.antigravity.google/docs/browser et d\'en lire le titre.");
console.log("3. Après succès réel seulement, lancer:");
console.log('   npm run computer-use:mark -- --status=verified --evidence="documentation Antigravity ouverte et lue"');
process.exitCode = 2;

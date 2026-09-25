#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const checks = [];
const add = (label, status, detail = "") => checks.push({ label, status, detail });
const exists = (rel) => fs.existsSync(path.join(root, rel));

add("Skill officiel /setup-saas", exists(".agents/skills/setup-saas/SKILL.md"), ".agents/skills/setup-saas/SKILL.md");
add("Configuration exemple", exists("africa-saas.config.example.json"));
add("Variables d’environnement exemple", exists(".env.example"));
add("Pipeline mobile WebView", exists("docs/mobile/mobile-app-pipeline.md") && exists("scripts/mobile-app-check.mjs"));
add("Contrôles Zod", exists("scripts/zod-validation-check.mjs") && exists("config/zod-validation.json"));
add("Baseline sécurité", exists("scripts/security-baseline-check.mjs") && exists("config/security-routes.json"));
add("Tests Vitest", exists("vitest.config.ts") && exists("tests"));

const lock = exists("package-lock.json");
const modules = exists("node_modules");
add("Lockfile npm", lock, lock ? "prêt pour npm ci" : "sera créé par npm install");
add("Dépendances installées", modules, modules ? "node_modules présent" : "lancer npm install");

let config = null;
try {
  config = JSON.parse(fs.readFileSync(path.join(root, "africa-saas.config.json"), "utf8"));
} catch {}
const mobileEnabled = Boolean(config?.mobileApp?.enabled || config?.mobile?.appEnabled || config?.mobileAppEnabled);
if (mobileEnabled) {
  add(
    "Mobile: URL de production",
    /^https:\/\//i.test(config?.mobileApp?.productionUrl || config?.mobile?.productionUrl || ""),
    "HTTPS requis pour le mode WebView",
  );
  if (process.platform === "darwin") {
    try {
      execFileSync("xcodebuild", ["-version"], { stdio: "ignore" });
      add("Mobile iOS: Xcode", true);
    } catch {
      add("Mobile iOS: Xcode", false, "à installer avant le build iPhone");
    }
  }
  try {
    execFileSync("java", ["-version"], { stdio: "ignore" });
    add("Mobile Android: JDK", true);
  } catch {
    add("Mobile Android: JDK", false, "à installer avant le build Android");
  }
}

const ok = checks.filter((c) => c.status).length;
const pending = checks.length - ok;
console.log("Africa SaaS Kit — Doctor\n");
for (const c of checks) console.log(`${c.status ? "✓" : "○"} ${c.label}${c.detail ? ` — ${c.detail}` : ""}`);
console.log(`\nRésumé: ${ok}/${checks.length} prêts, ${pending} à préparer.`);
console.log(
  "Commandes utiles: npm run setup-saas · npm run kit:verify · npm run kit:integrity · npm run dependencies:check · npm run verify:code",
);
console.log("Le Doctor est informatif: les éléments optionnels ou non installés ne bloquent pas le starter.");

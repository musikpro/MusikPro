#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (rel) => {
  try {
    return fs.readFileSync(path.join(root, rel), "utf8");
  } catch {
    return "";
  }
};
const json = (rel) => {
  try {
    return JSON.parse(read(rel));
  } catch {
    return null;
  }
};
const config = json("africa-saas.config.json") || json("africa-saas.config.example.json") || {};
const mobile = config.mobileApp || {};
const enabled = config.mobileAppEnabled === true || mobile.enabled === true;

console.log("Africa SaaS Kit — Capacitor Store Safety Check");
if (!enabled) {
  console.log("○ SKIPPED: application native désactivée. La PWA/Web peut être déployée indépendamment.");
  process.exit(0);
}

const failures = [];
const warnings = [];
const [nodeMajor] = process.versions.node.split(".").map(Number);
if (nodeMajor < 22)
  failures.push(
    `Capacitor 8 requiert Node.js 22+ pour le développement natif; version active: ${process.versions.node}.`,
  );

const cap = read("capacitor.config.ts");
if (!cap) failures.push("capacitor.config.ts absent — exécutez d’abord la préparation Capacitor.");
if (/server\s*:\s*\{[\s\S]*?url\s*:/m.test(cap))
  failures.push(
    "capacitor.config.ts utilise server.url. Capacitor documente ce mode pour le live reload, pas pour une configuration de production store.",
  );
if (/allowNavigation\s*:/m.test(cap))
  failures.push("capacitor.config.ts utilise allowNavigation. Ne pas certifier un build store sur ce mode distant.");
if (/cleartext\s*:\s*true/m.test(cap)) failures.push("cleartext=true est interdit pour la certification store du kit.");

const webDirMatch = cap.match(/webDir\s*:\s*["']([^"']+)["']/);
if (!webDirMatch) failures.push("webDir Capacitor absent.");
else {
  const webDir = webDirMatch[1];
  if (!fs.existsSync(path.join(root, webDir, "index.html"))) failures.push(`${webDir}/index.html absent.`);
}

const platforms = Array.isArray(mobile.platforms) ? mobile.platforms : [];
for (const platform of platforms) {
  if (["android", "ios"].includes(platform) && !fs.existsSync(path.join(root, platform)))
    warnings.push(`Projet ${platform} non généré dans cette copie.`);
}

if (failures.length) {
  for (const warning of warnings) console.warn(`⚠ ${warning}`);
  for (const failure of failures) console.error(`✗ ${failure}`);
  console.error(
    "\nStore safety: FAIL — la structure PWA/Capacitor peut servir au développement, mais elle ne doit pas être déclarée prête Play Store/App Store dans cet état.",
  );
  process.exit(1);
}
for (const warning of warnings) console.warn(`⚠ ${warning}`);
console.log("✓ Configuration Capacitor sans server.url/allowNavigation de développement.");
console.log(
  "Store safety: PASS structurel. Les builds signés, appareils réels et revues stores restent à valider séparément.",
);

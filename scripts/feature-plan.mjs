#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const raw = process.argv.slice(2).find((arg) => !arg.startsWith("--")) || process.argv.find((arg) => arg.startsWith("--name="))?.split("=").slice(1).join("=") || "";
const slug = raw
  .trim()
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "")
  .slice(0, 80);

if (!slug) {
  console.error("Usage: npm run feature:plan -- nom-de-la-feature");
  process.exit(1);
}

const plansDir = path.join(root, "docs/plans");
const stateDir = path.join(root, ".africa-saas");
fs.mkdirSync(plansDir, { recursive: true });
fs.mkdirSync(stateDir, { recursive: true });
const planRel = `docs/plans/${slug}.md`;
const planPath = path.join(root, planRel);

if (!fs.existsSync(planPath)) {
  const title = slug.split("-").map((part) => part ? part[0].toUpperCase() + part.slice(1) : part).join(" ");
  const md = `# ${title}\n\n- Statut : PLANIFIÉ\n- Créé : ${new Date().toISOString().slice(0, 10)}\n- Workflow : **PLAN → SPEC → TEST → CODE → VERIFY**\n\n## Objectif / problème\n\nDécrire le problème réel et le résultat attendu.\n\n## Réutilisation / anti-doublons\n\nLister les fonctionnalités existantes de \`config/features.json\` à réutiliser ou adapter.\n\n## Périmètre\n\nCe qui sera modifié.\n\n## Hors périmètre\n\nCe qui ne doit pas être modifié.\n\n## Données / migrations\n\nTables, champs, migrations, compatibilité et rollback. Écrire « Aucun » si non concerné.\n\n## API / contrats\n\nRoutes, méthodes, entrées, sorties et erreurs. Écrire « Aucun » si non concerné.\n\n## Auth / rôles / multi-tenant\n\nPermissions, ownership, isolation tenant. Écrire « Aucun » si non concerné.\n\n## Entrées non fiables / sécurité\n\nValidation Zod, taille/type, secrets, rate limiting, CSRF/origin, upload, fournisseurs externes.\n\n## Plan de tests avant code\n\n- [ ] Test nominal\n- [ ] Entrée invalide / erreur\n- [ ] Autorisation\n- [ ] Anti-régression\n\n## Critères d'acceptation\n\n- [ ] Critère mesurable 1\n- [ ] Aucun comportement existant cassé\n- [ ] Gates pertinents PASS\n\n## Plan d'implémentation\n\n1. Étape 1\n2. Étape 2\n\n## Rollback / réversibilité\n\nDécrire comment revenir en arrière sans perte de données.\n`;
  fs.writeFileSync(planPath, md);
}

const state = {
  version: 1,
  slug,
  plan: planRel,
  status: "planned",
  updatedAt: new Date().toISOString(),
};
fs.writeFileSync(path.join(stateDir, "current-feature.json"), JSON.stringify(state, null, 2) + "\n");
console.log(`Feature plan prêt : ${planRel}`);
console.log("Compléter PLAN/SPEC/TEST avant l'implémentation importante, puis lancer npm run feature:plan-check.");

#!/usr/bin/env node
// One-off fix: aligne la description déjà enregistrée en base des 4 offres de crédits
// par défaut sur la nouvelle logique "1 génération = 1 chanson" (lib/credit-plans/catalog.ts).
// À exécuter une seule fois contre la vraie base Neon, avec DATABASE_URL configuré.
// Idempotent : peut être relancé sans risque, il réécrit toujours les mêmes valeurs.
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_SERVICE_URL;
if (!url) {
  console.error("fix-plan-descriptions: FAIL — DATABASE_SERVICE_URL est requis (rôle musikpro_service, seul habilité à écrire sur plans).");
  process.exit(1);
}

const fixes = [
  { code: "credits-5", description: "2 générations, soit 2 chansons musicales" },
  { code: "credits-10", description: "5 générations, soit 5 chansons musicales" },
  { code: "credits-20", description: "10 générations, soit 10 chansons musicales" },
  { code: "credits-50", description: "25 générations, soit 25 chansons musicales" },
];

const sql = neon(url);
let updated = 0;
for (const fix of fixes) {
  const rows = await sql`
    UPDATE plans
    SET description = ${fix.description}, translations = NULL
    WHERE code = ${fix.code}
    RETURNING id, name, description
  `;
  if (rows.length === 0) {
    console.log(`- ${fix.code}: aucune ligne trouvée (offre absente ou code différent), ignoré.`);
    continue;
  }
  for (const row of rows) {
    console.log(`✓ ${row.name} (${fix.code}): "${row.description}"`);
    updated += 1;
  }
}

console.log(`\n${updated} offre(s) mise(s) à jour. Pense à relancer "Actualiser les traductions" sur /admin/languages.`);

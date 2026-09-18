#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const generated = path.join(root, "generated");
fs.mkdirSync(generated, { recursive: true });

if (args.has("--none")) {
  const md = `# Cloudflare — non utilisé\n\nCloudflare est optionnel. Aucun réglage Cloudflare n’est requis pour ce SaaS.\n\nPour mémoriser ce choix :\n\`npm run setup-saas:mark -- --phase=18 --status=skipped --note="Cloudflare non utilisé"\`\n`;
  fs.writeFileSync(path.join(generated, "cloudflare-setup.md"), md);
  console.log("✓ Cloudflare skipped / optional. No Cloudflare configuration required.");
  console.log('Next: npm run setup-saas:mark -- --phase=18 --status=skipped --note="Cloudflare non utilisé"');
  process.exit(0);
}

const md = `# Phase 18 — Cloudflare domaine/DNS (OPTIONNEL)\n\n> Cette phase concerne le domaine et le DNS. Elle **n’active pas Cloudflare R2**.\n\n## Objectif\nUtiliser Cloudflare seulement si tu veux y acheter/gérer le domaine ou y gérer le DNS. Le SaaS fonctionne aussi sans Cloudflare.\n\n## Étapes\n1. Ouvre ton compte Cloudflare et ajoute/achète le domaine si tu souhaites l’utiliser.\n2. Dans Vercel, ajoute le domaine custom au projet et note les enregistrements DNS exacts demandés par Vercel.\n3. Dans Cloudflare DNS, crée exactement ces enregistrements. Ne copie jamais des valeurs génériques depuis un tutoriel.\n4. Si la vérification Vercel/SSL échoue avec le proxy Cloudflare, repasse temporairement l’enregistrement en **DNS only** et revalide.\n5. Vérifie que le domaine HTTPS ouvre bien le SaaS et que www/apex se comportent comme prévu.\n6. Lance ensuite le Production Doctor online à la Phase 20.\n\n## Sécurité\n- Aucun token API Cloudflare n’est requis par le kit pour cette configuration guidée.\n- Ne colle pas de token Cloudflare dans le chat.\n- Cloudflare R2 est une fonctionnalité différente et reste désactivée tant qu’un vrai adaptateur storage n’existe pas.\n\n## Validation\nAprès test réel du domaine/DNS :\n\`npm run setup-saas:mark -- --phase=18 --status=passed --note="Cloudflare domaine/DNS validé"\`\n`;
fs.writeFileSync(path.join(generated, "cloudflare-setup.md"), md);
console.log("✓ Optional Cloudflare domain/DNS guide generated: generated/cloudflare-setup.md");
console.log("No Cloudflare API token is required by this guide.");

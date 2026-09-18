#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const manifestPath = path.join(root, "design/banani/screens.json");
const outputPath = path.join(root, "generated/implementation-plan.md");
const bananiGapPath = path.join(root, "generated/banani-gap-analysis.json");

if (!fs.existsSync(manifestPath)) {
  console.error("Missing design/banani/screens.json. Import/describe Banani screens first.");
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const screens = Array.isArray(manifest.screens) ? manifest.screens : [];
if (!screens.length) {
  console.error("No screens declared in design/banani/screens.json.");
  process.exit(1);
}

const bananiGap = fs.existsSync(bananiGapPath) ? JSON.parse(fs.readFileSync(bananiGapPath, "utf8")) : null;
const publicScreens = screens.filter((s) => s.auth === "public");
const protectedScreens = screens.filter((s) => s.auth !== "public");
const routeTable = screens
  .map((s, i) => `| ${i + 1} | ${s.name || s.id} | \`${s.route || "TBD"}\` | ${s.auth || "TBD"} | ${s.purpose || ""} |`)
  .join("\n");

const screenDetails = screens
  .map((s, i) => [
    `### ${i + 1}. ${s.name || s.id}`,
    `- Route: \`${s.route || "TBD"}\``,
    `- Accès: ${s.auth || "TBD"}`,
    `- But: ${s.purpose || "À préciser"}`,
    `- États à implémenter: ${(s.states || ["default"]).join(", ")}`,
    `- Notes Banani: ${s.notes || "Aucune"}`,
    "- Critères de validation: rendu responsive, loading skeleton, empty/error si applicables, aucune donnée sensible dans les props client, permissions serveur testées.",
    s.auth === "public"
      ? "- SEO: title unique, description, canonical, index/noindex, sitemap, social preview 1200×630."
      : "- SEO: route privée noindex et hors sitemap.",
    "",
  ].join("\n"))
  .join("\n");

const publicList = publicScreens.length
  ? publicScreens.map((s, i) => `${i + 1}. ${s.name} — \`${s.route}\``).join("\n")
  : "Aucun écran public déclaré.";
const protectedList = protectedScreens.length
  ? protectedScreens.map((s, i) => `${i + 1}. ${s.name} — \`${s.route}\``).join("\n")
  : "Aucun écran protégé déclaré.";

const sections = [
`# Plan d'implémentation SaaS — généré depuis Banani

> Ce fichier est un plan de travail. L'IA doit le lire AVANT de modifier le code et avancer phase par phase. Elle ne doit pas déclarer une phase terminée sans vérifier ses critères.

## 0. Source de vérité design
- Projet: ${manifest.project || "SaaS"}
- Source: ${manifest.source || "banani"}
- Écrans déclarés: ${screens.length}
- Écrans publics: ${publicScreens.length}
- Écrans protégés: ${protectedScreens.length}

## 1. Inventaire des écrans

| # | Écran | Route | Accès | Objectif |
|---:|---|---|---|---|
${routeTable}`,
`## 1bis. Comparaison Banani → Starter
${bananiGap ? `- RÉUTILISER: ${bananiGap.counts?.["RÉUTILISER"] ?? 0}\n- ADAPTER: ${bananiGap.counts?.ADAPTER ?? 0}\n- CRÉER: ${bananiGap.counts?.["CRÉER"] ?? 0}\n- À CONFIRMER: ${bananiGap.counts?.["À CONFIRMER"] ?? 0}\n\nVoir \`generated/banani-gap-analysis.md\` avant toute implémentation.` : "Gap analysis Banani non disponible. Exécuter /import-banani puis npm run import-banani:analyze."}`,
`## 2. Ordre obligatoire d'implémentation

### Phase A — Compréhension avant code
1. Lire \`DESIGN.md\`, ce plan et \`design/banani/screens.json\`.
2. Identifier composants réutilisables, layouts et tokens visuels.
3. Identifier les écrans qui exigent des données réelles.
4. Mapper chaque donnée vers le schéma Neon/Drizzle.
5. Lister les routes API/Server Actions nécessaires.
6. Lister permissions, rôles et cas multi-tenant.
7. Identifier paiements, emails, uploads et intégrations externes concernés.
8. Bloquer toute hypothèse métier non soutenue par le design ou le brief et la marquer \`À CONFIRMER\`.

**Gate A :** aucune implémentation ne commence avant que la matrice écran → données → action → permission soit complète.

### Phase B — Fondation technique
1. Vérifier env, Neon, Better Auth et Resend; vérifier les providers uniquement s’ils ont été activés volontairement.
2. Générer/migrer le schéma DB.
3. Vérifier rôles et permissions serveur.
4. Vérifier headers, rate limiting et Turnstile selon le niveau de sécurité.
5. Vérifier le lockfile et lancer \`npm audit\`.

**Gate B :** \`npm run setup:check\` et \`npm run security:check\` doivent passer sans FAIL.

### Phase C — Design system et mobile-first
1. Extraire couleurs, espacements, typographies et rayons depuis Banani.
2. Mapper les composants vers les primitives internes.
3. Créer les primitives manquantes avant de dupliquer du JSX.
4. Construire le layout mobile en premier, puis tablette et desktop.
5. Valider 320, 360, 390, 430, 768, 1024 et 1440 px.
6. Vérifier safe area, cibles tactiles, clavier mobile, navigation fluide et absence de scroll horizontal global.
7. Prévoir \`loading.tsx\` ou \`Suspense\` avec skeleton fidèle pour chaque écran data-driven.
8. Lancer \`npm run mobile:check\` et \`npm run ui:loading-check\`.

**Gate Mobile + Loading :** aucun écran suivant ne commence avant validation du mobile 320–430 px, du skeleton et des débordements.

### Phase D — Écrans publics
${publicList}

Pour chaque écran public : prévoir dès maintenant metadata SEO, canonical, social preview et indexation.

### Phase E — Authentification et onboarding
1. Inscription, connexion, vérification email, reset password.
2. 2FA selon politique.
3. Organisation/team si le SaaS est multi-tenant.
4. Tests utilisateur A/B pour vérifier l'isolation.

### Phase F — Écrans protégés
${protectedList}

Pour chaque écran protégé :
- session vérifiée côté serveur ;
- ownership/tenant vérifié ;
- Zod sur entrées ;
- état loading / empty / error ;
- réponses API minimales ;
- aucun contrôle de rôle uniquement côté client ;
- metadata \`noindex\` et absence du sitemap.

### Phase G — Monétisation / paiements (OPTIONNEL)
1. Lire \`docs/payments/local-payment-lab.md\` avant les tests sandbox.
2. Sélectionner les providers autorisés par pays.
3. Créer le checkout côté serveur depuis \`planId\`, jamais depuis un montant client.
4. Persister PENDING avant redirection.
5. Vérifier webhook/IPN.
6. Re-puller le paiement chez le provider.
7. Comparer montant, devise, référence et statut.
8. Appliquer l'idempotence.
9. Activer abonnement/crédits uniquement après réconciliation.
10. Tester paiements tardifs et fallback.
11. En local : \`npm run payments:ngrok\` + \`npm run payments:local\`, puis configurer le webhook sandbox généré.
12. Tester duplicate/replay depuis ngrok et confirmer un fulfillment unique.

**Gate Paiement Local :** aucun provider n'est déclaré testé tant que succès + échec/annulation + pending/retard + duplicate/replay n'ont pas été observés.

### Phase H — Emails, stockage et jobs
1. Emails transactionnels Resend.
2. Uploads privés/publics séparés et validés si le stockage est réellement intégré.
3. Jobs/cron idempotents.
4. Logs sans secrets.

### Phase I — Google, SEO et partage social
1. Lire \`docs/seo/google-seo.md\`.
2. Pour chaque écran public : title unique, description, canonical, décision index/noindex.
3. Ajouter uniquement les pages publiques indexables au sitemap ; garder auth/dashboard/admin/setup/API hors sitemap et noindex.
4. Vérifier Open Graph/Twitter Card et prévoir une image 1200×630 spécifique pour les pages marketing stratégiques lorsque nécessaire.
5. Ajouter JSON-LD uniquement si les données structurées correspondent au contenu visible.
6. Exécuter \`npm run seo:check\`.
7. Après déploiement, vérifier Search Console, soumettre le sitemap et inspecter les URLs stratégiques.
8. Vérifier Google OAuth/domaine/callbacks si OAuth est activé.

**Gate SEO :** aucune page publique n'est terminée sans metadata, canonical, stratégie d'indexation et social preview vérifiables.

### Phase J — Tests et sécurité
1. \`npm run mobile:check\`.
2. \`npm run ui:loading-check\`.
3. \`npm run seo:check\`.
4. Typecheck/build.
5. Tests auth et permissions.
6. Test deux comptes.
7. Test client déloyal sur API/actions.
8. Test des webhooks rejoués.
9. \`npm run security:audit\`.
10. \`npm run doctor:production\`.

### Phase K — Production
1. Tous les FAIL du Production Doctor corrigés.
2. Tous les WARN explicitement acceptés ou corrigés.
3. Secrets production séparés du sandbox.
4. DNS/HTTPS/headers vérifiés.
5. Backups et procédure incident confirmés.
6. Search Console et social previews réellement testés sur l'URL HTTPS publique.
7. Déploiement progressif puis vérification post-déploiement.`,
`## 3. Détail par écran

${screenDetails}`,
`## 4. Règle pour l'IA
À chaque phase, l'IA doit répondre avec :
1. ce qu'elle va implémenter ;
2. les fichiers concernés ;
3. les risques sécurité ;
4. le résultat attendu ;
5. les tests à exécuter ;
6. le statut du gate avant de passer à la phase suivante.

Elle ne doit jamais sauter directement de l'import Banani au code complet du SaaS.`
];

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, sections.join("\n\n"));
console.log(`Implementation plan generated: ${path.relative(root, outputPath)}`);

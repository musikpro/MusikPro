#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { kitVersion } from "./lib/version.mjs";

const root = process.cwd();
const envFile = path.join(root, ".env.local");
const configFile = path.join(root, "africa-saas.config.json");
const providersFile = path.join(root, "config/providers.json");
const progressFile = path.join(root, ".africa-saas/setup-progress.json");

function parseEnv(file) {
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 1) continue;
    let value = line.slice(i + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
      value = value.slice(1, -1);
    out[line.slice(0, i).trim()] = value;
  }
  return out;
}
function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}
function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}
function configured(value) {
  return Boolean(value && String(value).trim());
}
function all(values) {
  return values.every(Boolean);
}
function phaseState(checks) {
  const required = checks.filter((c) => c.required !== false);
  if (!required.length) return "green";
  const done = required.filter((c) => c.ok).length;
  if (done === required.length) return "green";
  if (done > 0) return "yellow";
  return "red";
}
const icon = { green: "🟢", yellow: "🟡", red: "🔴", unverified: "⚪" };

const env = parseEnv(envFile);
const config = readJson(configFile);
const providers = readJson(providersFile) || {};
const progress = readJson(progressFile) || { phases: {} };
const enabledProviders = Array.isArray(config?.providers) ? config.providers : [];
const nodeOk = Number(process.versions.node.split(".")[0]) >= 20;
const configOk = Boolean(config);
const envOk = exists(".env.local");
const lockOk = exists("package-lock.json");
const dbOk = configured(env.DATABASE_URL);
const authOk = configured(env.BETTER_AUTH_SECRET) && configured(env.BETTER_AUTH_URL);
const emailPasswordSelected = config
  ? config.emailPasswordEnabled !== false
  : env.AUTH_EMAIL_PASSWORD_ENABLED !== "false";
const resendSelected = config?.email === "resend" || emailPasswordSelected;
const resendOk = !resendSelected || all([configured(env.RESEND_API_KEY), configured(env.EMAIL_FROM)]);
const googleSelected = Boolean(config?.googleAuth);
const googleOk = !googleSelected || all([configured(env.GOOGLE_CLIENT_ID), configured(env.GOOGLE_CLIENT_SECRET)]);
const searchSelected = Boolean(config?.searchConsole);
const searchConfigured = !searchSelected || configured(env.GOOGLE_SITE_VERIFICATION);
const upstashOk = all([configured(env.UPSTASH_REDIS_REST_URL), configured(env.UPSTASH_REDIS_REST_TOKEN)]);
const turnstileConfigured = all([configured(env.TURNSTILE_SECRET_KEY), configured(env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)]);
const cronOk = configured(env.CRON_SECRET);
const webhookBaseOk = configured(env.PAYMENT_WEBHOOK_BASE_URL);
const codexConfigPath = path.join(root, ".codex/config.toml");
const codexConfigExists = fs.existsSync(codexConfigPath);
const codexConfigText = codexConfigExists ? fs.readFileSync(codexConfigPath, "utf8") : "";
const bananiMcpConfigured =
  /\[\s*mcp_servers\.banani\s*\]/i.test(codexConfigText) &&
  /^\s*url\s*=\s*["'][^"']+["']/im.test(codexConfigText) &&
  /Authorization/i.test(codexConfigText) &&
  /Bearer\s+[^"'\s}]+/i.test(codexConfigText);
const screens = readJson(path.join(root, "design/banani/screens.json"));
const screensText = exists("design/banani/screens.json")
  ? fs.readFileSync(path.join(root, "design/banani/screens.json"), "utf8")
  : "";
const importedDesignPath = path.join(root, "design/banani/imported-design.json");
let importedDesign = null;
try {
  importedDesign = fs.existsSync(importedDesignPath) ? JSON.parse(fs.readFileSync(importedDesignPath, "utf8")) : null;
} catch {}
const bananiImported =
  Boolean(importedDesign?.screens?.length) &&
  Boolean(screens?.screens?.length) &&
  !/Remplacer ou compléter cet exemple|Exemple de structure attendue/i.test(screensText);
const gapGenerated = exists("generated/banani-gap-analysis.md");
const planGenerated = exists("generated/implementation-plan.md");
const buildGenerated = exists(".next/BUILD_ID");
const handoffGenerated = exists("generated/deployment-handoff.md");
const doctorReport = readJson(path.join(root, "generated/production-doctor.json"));
const doctorGenerated = Boolean(doctorReport) || exists("generated/production-doctor.md");
const doctorReady = doctorReport?.verdict === "READY";
const computerUseState = readJson(path.join(root, ".africa-saas/computer-use.json"));
const computerUseVerified = computerUseState?.status === "verified";

const ngrokInstalledHint = false; // cannot reliably prove from pure JS without spawning; workflow will test it.

const providerChecks = enabledProviders.map((id) => {
  const p = providers[id];
  if (!p) return { id, label: id, ok: false, readiness: "unknown", present: 0, total: 0, env: [] };
  const names = Array.isArray(p.env) ? p.env : [];
  const present = names.filter((name) => configured(env[name])).length;
  return {
    id,
    label: p.label || id,
    ok: present === names.length,
    readiness: p.readiness,
    present,
    total: names.length,
    env: names,
  };
});
const paymentsOk = enabledProviders.length > 0 && providerChecks.every((p) => p.ok);

const phases = [
  {
    n: 1,
    title: "Prendre connaissance du kit et de l’outillage",
    goal: "Vérifier que l’environnement local peut exécuter le starter et que l’IA a lu les règles du kit.",
    role: "Cette phase vérifie que ton Mac, Antigravity et le kit disposent des fichiers/règles nécessaires pour travailler proprement.",
    benefit:
      "Elle évite de commencer le projet avec un environnement incomplet ou une IA qui n’a pas lu les règles du starter.",
    checks: [
      { label: "Node.js >= 20", ok: nodeOk, detail: `Node ${process.versions.node}` },
      { label: "AGENTS.md", ok: exists("AGENTS.md"), detail: "Règles IA du kit" },
      { label: "SECURITY.md", ok: exists("SECURITY.md"), detail: "Règles sécurité" },
      { label: "DESIGN.md", ok: exists("DESIGN.md"), detail: "Workflow Banani / design" },
    ],
    actions: [
      "Ouvrir le dossier du kit dans Antigravity.",
      "Dans l’Agent Antigravity, lancer `/setup-saas`.",
      "L’IA doit lire AGENTS.md, SECURITY.md, DESIGN.md et README.md avant toute modification.",
      "Exécuter `npm run features:list` pour connaître les fonctionnalités déjà présentes et éviter les doublons avant de coder.",
    ],
    validate: "Relancer `npm run setup-saas` et vérifier que la Phase 1 est verte.",
  },
  {
    n: 2,
    title: "Activer et vérifier Computer Use / Browser Tools",
    goal: "S’assurer qu’Antigravity peut réellement ouvrir et manipuler le navigateur pour assister les tests visuels tout au long du projet.",
    role: "Antigravity intègre un Browser Subagent capable d’ouvrir, lire et manipuler Chrome. Cette phase vérifie son activation réelle; il n’existe pas de package npm computer-use à installer dans le SaaS.",
    benefit:
      "Elle permet à l’IA de vérifier visuellement les pages, responsive, formulaires, OAuth, uploads, paiements sandbox, previews Vercel, SEO et domaine final au lieu de se limiter au code.",
    checks: [
      {
        label: "Skill /computer-use",
        ok: exists(".agents/skills/computer-use/SKILL.md"),
        detail: "Workflow navigateur du kit",
      },
      {
        label: "Guide Browser Tools",
        ok: exists("docs/computer-use/antigravity-browser.md"),
        detail: "Activation et règles de sécurité",
      },
      {
        label: "Browser Subagent vérifié",
        ok: computerUseVerified,
        detail: computerUseVerified
          ? `Preuve locale: ${computerUseState?.evidence || "test navigateur réussi"}`
          : "NON VÉRIFIÉ — un vrai test navigateur est requis",
      },
    ],
    actions: [
      "Exécuter `npm run computer-use:check`.",
      "Dans Antigravity, ouvrir Settings → Browser et vérifier que Browser Tools ne sont pas désactivés. Aucun package npm supplémentaire n’est requis.",
      "Conserver une politique de Request Review pour les actions navigateur sensibles et n’autoriser que les domaines nécessaires dans l’Allowlist.",
      "Demander à l’agent d’utiliser réellement le Browser Subagent pour ouvrir `https://www.antigravity.google/docs/browser` et lire le titre de la page. Cette preuve ne dépend pas encore de `npm install`.",
      'Après succès réel seulement, exécuter `npm run computer-use:mark -- --status=verified --evidence="Browser Subagent: documentation Antigravity ouverte et lue"`.',
      "Relancer `npm run computer-use:check` puis `/setup-saas`.",
    ],
    validate:
      "La phase passe uniquement après une vraie action Browser Subagent observée. Hors Antigravity, utiliser un outil navigateur équivalent ou marquer cette phase `skipped` avec justification.",
  },
  {
    n: 3,
    title: "Installer les dépendances locales",
    goal: "Installer les packages exacts du projet et créer le lockfile qui sera conservé dans GitHub.",
    role: "npm installe les bibliothèques nécessaires au projet et le lockfile fige exactement les versions utilisées.",
    benefit:
      "Elle rend les installations reproductibles entre ton Mac, GitHub Actions et Vercel, et permet les audits de dépendances.",
    checks: [
      { label: "package-lock.json", ok: lockOk, detail: lockOk ? "Présent" : "Manquant" },
      { label: "package.json", ok: exists("package.json"), detail: "Manifeste npm" },
    ],
    actions: [
      "Dans le terminal Antigravity, exécuter `npm install`.",
      "Ne pas supprimer `package-lock.json` après l’installation.",
      "Exécuter ensuite `npm run security:check` pour un premier contrôle.",
    ],
    validate: "`package-lock.json` existe et `npm run security:check` ne signale pas de blocage critique.",
  },
  {
    n: 4,
    title: "Configurer l’identité du SaaS",
    goal: "Définir le pays principal, la devise, le nom, le niveau de sécurité et les services de base. Les paiements sont volontairement reportés à la Phase 17.",
    role: "Cette phase définit l’identité technique du SaaS : nom, pays, devise, URL locale et niveau de sécurité.",
    benefit: "Elle donne au kit un contexte cohérent avant de créer la base, l’authentification et les écrans.",
    checks: [
      {
        label: "africa-saas.config.json",
        ok: configOk,
        detail: configOk
          ? `${config?.appName || "SaaS"} / ${config?.country || "?"} / ${config?.currency || "?"}`
          : "Non généré",
      },
      { label: ".env.local", ok: envOk, detail: envOk ? "Présent (valeurs non affichées)" : "Non généré" },
    ],
    actions: [
      "Exécuter `npm run setup` et répondre aux questions du wizard, ou utiliser son mode non interactif si les choix sont déjà connus.",
      "Choisir `SECURITY_LEVEL=high` par défaut pour un SaaS réel.",
      "Ne configurer aucun provider de paiement à cette étape : ils sont optionnels et réservés à la Phase 17.",
      "Ne jamais coller une clé secrète dans le chat : l’écrire directement dans `.env.local`.",
    ],
    validate: "Exécuter `npm run setup:check` puis `npm run setup-saas`.",
  },
  {
    n: 5,
    title: "Créer et connecter Neon PostgreSQL",
    goal: "Connecter la base PostgreSQL utilisée par Drizzle et Better Auth.",
    role: "Neon est la base PostgreSQL du SaaS. Elle stocke les utilisateurs, plans, transactions, paramètres et données métier.",
    benefit:
      "Elle apporte une base de données cloud PostgreSQL compatible serverless, utilisée par Drizzle et Better Auth.",
    checks: [
      {
        label: "DATABASE_URL",
        ok: dbOk,
        detail: dbOk ? "Configurée (connexion externe encore à tester)" : "Manquante",
      },
    ],
    actions: [
      "Créer/ouvrir un compte Neon et créer un projet PostgreSQL.",
      "Dans Neon, ouvrir Connection Details et copier la connection string recommandée pour l’application.",
      "Dans `.env.local`, renseigner `DATABASE_URL=...` directement, sans envoyer la valeur dans le chat.",
      "Conserver SSL activé dans la connection string Neon.",
    ],
    validate:
      "Après installation des dépendances : exécuter `npm run db:generate` puis `npm run db:migrate` sur une base de développement/staging.",
  },
  {
    n: 6,
    title: "Générer Better Auth et la base d’authentification",
    goal: "Préparer les tables d’auth, les sessions et les secrets sans imposer un compte pour accéder au kit.",
    role: "Better Auth gère l’authentification : sessions, connexion, reset mot de passe, Google OAuth, 2FA et rôles.",
    benefit:
      "Elle apporte une couche d’identité sécurisée sans devoir construire soi-même la gestion des mots de passe et sessions.",
    checks: [
      {
        label: "BETTER_AUTH_SECRET",
        ok: configured(env.BETTER_AUTH_SECRET),
        detail: configured(env.BETTER_AUTH_SECRET) ? "Configuré" : "Manquant",
      },
      {
        label: "BETTER_AUTH_URL",
        ok: configured(env.BETTER_AUTH_URL),
        detail: configured(env.BETTER_AUTH_URL) ? env.BETTER_AUTH_URL : "Manquant",
      },
      { label: "Schéma auth généré", ok: exists("db/schema/auth.generated.ts"), detail: "Fichier Better Auth" },
    ],
    actions: [
      "Si `BETTER_AUTH_SECRET` manque, le générer avec une valeur aléatoire longue et l’écrire dans `.env.local`.",
      "En local, utiliser `BETTER_AUTH_URL=http://localhost:3000`.",
      "Exécuter `npm run auth:generate` puis inspecter le diff généré.",
      "Exécuter ensuite `npm run db:generate && npm run db:migrate`.",
    ],
    validate: "Le schéma auth est généré et les migrations passent sur la base de développement.",
  },
  {
    n: 7,
    title: "Configurer les emails et Google",
    goal: "Configurer les emails transactionnels, Google OAuth et la préparation Search Console selon les choix du projet.",
    role: "Resend sert aux emails transactionnels et Google sert à la connexion OAuth ainsi qu’à la préparation Search Console.",
    benefit:
      "Cette phase permet d’envoyer les emails du SaaS, proposer la connexion Google et préparer la visibilité Google du site.",
    checks: [
      {
        label: "Resend",
        ok: resendOk,
        required: resendSelected,
        detail: resendSelected
          ? resendOk
            ? "RESEND_API_KEY + EMAIL_FROM configurés"
            : "Email/mot de passe actif : Resend incomplet"
          : "Email/mot de passe désactivé",
      },
      {
        label: "Google OAuth",
        ok: googleOk,
        required: googleSelected,
        detail: googleSelected
          ? googleOk
            ? "Client ID + Secret configurés"
            : "Identifiants incomplets"
          : "Non sélectionné",
      },
      {
        label: "Search Console",
        ok: searchConfigured,
        required: searchSelected,
        detail: searchSelected
          ? configured(env.GOOGLE_SITE_VERIFICATION)
            ? "Token local présent; vérification Google encore externe"
            : "Token manquant"
          : "Non sélectionné",
      },
    ],
    actions: [
      "Si email/mot de passe est activé : Resend est requis en production. Créer une API key, vérifier le domaine expéditeur et renseigner `RESEND_API_KEY` + `EMAIL_FROM`.",
      "Si tu ne veux pas Resend : désactiver explicitement email/mot de passe (`AUTH_EMAIL_PASSWORD_ENABLED=false`) et utiliser Google OAuth ou un autre provider d’auth ajouté au projet.",
      "Google OAuth : créer un OAuth Web Client dans Google Cloud Console et renseigner `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` localement.",
      "Ajouter le callback local Better Auth demandé par le projet et, plus tard, le callback du vrai domaine Vercel.",
      "Search Console : conserver la vérification réelle pour la phase production, quand le domaine HTTPS existe.",
    ],
    validate:
      "Email/mot de passe ne doit jamais être déclaré prêt en production sans livraison email fonctionnelle. Tester Resend et Google OAuth après lancement de l’app; Search Console reste NON VÉRIFIÉE avant domaine public.",
  },
  {
    n: 8,
    title: "Configurer la sécurité d’infrastructure",
    goal: "Activer les protections nécessaires au runtime : rate limiting, anti-bot et secret cron.",
    role: "Cette phase met en place les protections d’infrastructure comme le rate limiting, l’anti-bot et les secrets de cron.",
    benefit:
      "Elle réduit les attaques automatisées, le spam, les abus d’API et les appels non autorisés aux tâches planifiées.",
    checks: [
      {
        label: "Turnstile",
        ok: turnstileConfigured,
        required: false,
        detail: turnstileConfigured ? "Configuré" : "Recommandé pour les formulaires publics",
      },
      {
        label: "CRON_SECRET",
        ok: cronOk,
        required: false,
        detail: cronOk
          ? "Configuré"
          : "Optionnel à ce stade; requis plus tard seulement pour les cron réellement utilisés",
      },
    ],
    actions: [
      "Ne générer `CRON_SECRET` que si le SaaS utilise réellement un cron protégé; le cron de réconciliation paiement n’est requis que si les paiements sont activés en Phase 17.",
      "Configurer Cloudflare Turnstile si le SaaS expose inscription, login ou formulaires publics.",
    ],
    validate:
      "Exécuter `npm run security:check`; les protections obligatoires du niveau choisi doivent être satisfaites.",
  },
  {
    n: 9,
    title: "Importer le design Banani",
    goal: "Transformer les écrans importés en inventaire exploitable par l’IA sans coder immédiatement.",
    role: "Banani sert à préparer/importer les écrans et l’interface avant le codage.",
    benefit:
      "Il donne à l’IA une référence visuelle claire afin de construire le SaaS selon le design voulu au lieu d’improviser l’interface.",
    checks: [
      { label: "DESIGN.md", ok: exists("DESIGN.md"), detail: "Règles design" },
      {
        label: "Banani MCP via .codex/config.toml",
        ok: bananiMcpConfigured,
        detail: bananiMcpConfigured
          ? "Configuré localement (token non affiché)"
          : codexConfigExists
            ? "Fichier présent mais Banani MCP non configuré"
            : "À créer avec npm run banani:prepare",
      },
      {
        label: "Écrans Banani réellement importés",
        ok: bananiImported,
        detail: bananiImported
          ? "Snapshot MCP + inventaire normalisé présents"
          : "Lancer /import-banani après connexion MCP",
      },
      {
        label: "Gap analysis Banani → Starter",
        ok: gapGenerated,
        detail: gapGenerated
          ? "generated/banani-gap-analysis.md présent"
          : "À générer avec npm run import-banani:analyze",
      },
    ],
    actions: [
      "Exécuter `npm run banani:prepare`. Cette commande crée seulement `.codex/config.toml` vide si nécessaire et ne l’écrase jamais.",
      "Ouvrir `.codex/config.toml` et coller MANUELLEMENT la configuration MCP Banani obtenue depuis ton compte Banani. Ne jamais coller le token dans le chat.",
      "Exécuter `npm run banani:check` pour vérifier la structure et la protection Git sans afficher le token.",
      "Redémarrer/recharger Codex ou Antigravity si nécessaire afin qu’il relise la configuration MCP.",
      "Dans Antigravity/Codex, lancer `/import-banani` afin que l’agent parcoure le design via MCP et crée `design/banani/imported-design.json` sans secret.",
      "Exécuter `npm run import-banani:check` puis `npm run import-banani:analyze` pour comparer Banani au starter et synchroniser `design/banani/screens.json`.",
      "Lire `generated/banani-gap-analysis.md` : RÉUTILISER / ADAPTER / CRÉER / À CONFIRMER avant toute implémentation.",
      "Ne pas demander à Banani de décider des règles métier, des permissions ou de la sécurité.",
      "Exécuter `npm run design:check`.",
    ],
    validate:
      "`npm run banani:check` et `npm run import-banani:check` passent, le gap analysis existe et le handoff design passe avant toute construction massive.",
  },
  {
    n: 10,
    title: "Planifier le SaaS et attacher le CRUD Clients post-Banani",
    goal: "Produire l’ordre de construction complet puis mettre à disposition le CRUD Clients sécurisé seulement après l’import réel des écrans Banani.",
    role: "Le Implementation Planner transforme les écrans en ordre de construction; la brique CRUD Clients Prisma est ensuite attachée aux écrans concernés sans dicter le design.",
    benefit:
      "Cette phase évite de coder au hasard et fournit Create/Read/Update/Delete Clients prêt à brancher, avec Zod, Better Auth, rate limiting et RLS.",
    checks: [
      { label: "Planificateur", ok: exists("scripts/generate-implementation-plan.mjs"), detail: "Présent" },
      {
        label: "Plan généré",
        ok: planGenerated,
        detail: planGenerated ? "generated/implementation-plan.md présent" : "À générer après import Banani",
      },
      {
        label: "CRUD Clients Prisma",
        ok:
          exists("prisma/schema.prisma") &&
          exists("app/api/clients/route.ts") &&
          exists("app/api/clients/[id]/route.ts"),
        detail: "Scaffold sécurisé disponible après Banani",
      },
      {
        label: "Guide CRUD Clients",
        ok: exists("docs/features/clients-crud.md"),
        detail: "Ordre post-Banani documenté",
      },
    ],
    actions: [
      "Exécuter `npm run import-banani:analyze` si ce n’est pas déjà fait, puis `npm run design:plan`.",
      "L’IA doit présenter les phases d’implémentation : architecture, données, permissions, pages, auth, paiements, email/jobs, SEO, tests et production.",
      "Toute règle métier absente des écrans doit être marquée À CONFIRMER, jamais inventée.",
      "Après l’import Banani, exécuter `npm run clients:crud:generate` puis `npm run clients:crud:check` pour vérifier la brique Clients.",
      "Si les écrans/besoins utilisent des Clients, appliquer la migration en développement avec `npm run clients:crud:migrate`, puis brancher les écrans Banani sur `/api/clients/*`.",
      "Tester avec deux comptes distincts qu’un utilisateur ne peut ni lire ni modifier le Client d’un autre. Si le SaaS n’a pas de notion Client, laisser cette brique non branchée.",
    ],
    validate:
      "Le plan existe, le CRUD Clients passe `npm run clients:crud:check`, et la migration n’est appliquée qu’après import Banani si la fonctionnalité est réellement utilisée.",
  },
  {
    n: 11,
    title: "Construire mobile-first, responsive et avec skeleton loaders",
    goal: "Garantir une vraie expérience mobile avant tablette/desktop.",
    role: "Cette phase impose une construction mobile-first, responsive et des skeleton loaders pendant les chargements.",
    benefit:
      "Elle apporte une application fluide sur smartphone, tablette et desktop, avec navigation adaptée et moins de sauts visuels.",
    checks: [
      { label: "Mobile-first gate", ok: exists("scripts/mobile-first-check.mjs"), detail: "Présent" },
      {
        label: "Skeleton gate",
        ok: exists("scripts/loading-check.mjs") && exists("components/ui/skeleton.tsx"),
        detail: "Présent",
      },
      {
        label: "Validation visuelle mobile réelle",
        ok: false,
        detail: "À tester sur 320/360/390/430 px puis marquer la phase après vérification",
      },
    ],
    actions: [
      "Construire chaque écran d’abord en 320 / 360 / 390 / 430 px, puis tablette et desktop.",
      "Prévoir navigation mobile fluide, safe areas, boutons tactiles et absence de scroll horizontal global.",
      "Pour toute page data-driven, créer un `loading.tsx` ou un fallback Suspense avec skeleton fidèle au contenu final.",
      "Tester les états loading, empty, error et success.",
    ],
    validate:
      "Exécuter `npm run mobile:check` et `npm run ui:loading-check`, puis effectuer une vérification visuelle réelle des viewports.",
  },
  {
    n: 12,
    title: "Préparer SEO Google et partage social",
    goal: "Rendre les pages publiques indexables proprement et partageables avec image d’aperçu.",
    role: "Le SEO prépare les pages publiques pour Google et les aperçus de partage sur WhatsApp, Facebook, LinkedIn et autres.",
    benefit:
      "Il apporte metadata, canonical, sitemap, robots, Open Graph, images sociales et règles d’indexation propres.",
    checks: [
      { label: "SEO gate", ok: exists("scripts/seo-check.mjs"), detail: "Présent" },
      { label: "sitemap", ok: exists("app/sitemap.ts"), detail: "Présent" },
      { label: "Open Graph image", ok: exists("app/opengraph-image.tsx"), detail: "Présent" },
    ],
    actions: [
      "Définir title, description, canonical et Open Graph pour chaque page publique importante.",
      "Conserver dashboard/admin/auth/setup en `noindex`.",
      "Vérifier sitemap.xml, robots.txt, favicon, manifest et image 1200×630.",
      "Exécuter `npm run seo:check`.",
    ],
    validate:
      "Le SEO preflight passe; l’indexation Google reste NON VÉRIFIÉE tant que Search Console n’a pas confirmé le domaine.",
  },
  {
    n: 13,
    title: "Tester la qualité, la sécurité et le build",
    goal: "Bloquer la mise en ligne tant que le code ne compile pas et que les contrôles critiques échouent.",
    role: "Cette phase contrôle que le code compile, que les dépendances sont auditées et que les règles de sécurité/UI sont respectées.",
    benefit: "Elle détecte les régressions techniques avant d’envoyer le projet sur GitHub/Vercel.",
    checks: [
      { label: "Security preflight", ok: exists("scripts/security-check.mjs"), detail: "Disponible" },
      { label: "Security audit", ok: exists("scripts/security-audit.sh"), detail: "Disponible" },
      {
        label: "Health / readiness",
        ok: exists("app/api/health/route.ts") && exists("app/api/readyz/route.ts"),
        detail: "Sondes backend présentes",
      },
      {
        label: "Vitest",
        ok: exists("vitest.config.ts") && exists("tests/payments/provider-base.test.ts"),
        detail: "Suite unitaire présente",
      },
      {
        label: "ESLint / Prettier",
        ok: exists("eslint.config.mjs") && exists(".prettierrc.json"),
        detail: "Qualité de code configurée",
      },
      {
        label: "Build production exécuté",
        ok: buildGenerated,
        detail: buildGenerated ? ".next/BUILD_ID présent" : "npm run build n’a pas encore produit de build local",
      },
    ],
    actions: [
      "Ouvrir `/api/health` puis `/api/readyz` et vérifier les statuts backend.",
      "Exécuter `npm run format:check`, `npm run runtime:check` et `npm run features:check`.",
      "Exécuter `npm run lint`.",
      "Exécuter `npm run typecheck` et `npm run test`.",
      "Avec `npm run dev` actif, exécuter `npm run smoke:system` pour health/readyz/auth/SEO.",
      "Exécuter `npm run build`.",
      "Exécuter `npm run audit:prod` puis `npm audit` pour inclure aussi les dépendances de développement.",
      "Exécuter `npm run security:check` et `npm run security:audit`.",
      "Tester deux comptes distincts et tenter l’accès croisé à une ressource d’un autre utilisateur.",
    ],
    validate:
      "Health/readiness, format, lint, tests, typecheck et build doivent réussir; aucune vulnérabilité critique/haute non acceptée avant staging.",
  },
  {
    n: 14,
    title: "Préparer le handoff GitHub / Vercel",
    goal: "Préparer la liste des variables, callbacks et contrôles nécessaires au déploiement, sans encore exiger les paiements.",
    role: "Le Deployment Handoff rassemble les variables, callbacks, webhooks et paramètres nécessaires au déploiement.",
    benefit: "Il évite d’oublier une clé ou une URL et te donne une checklist adaptée au SaaS réellement construit.",
    checks: [
      { label: "Deployment handoff", ok: exists("scripts/deployment-handoff.mjs"), detail: "Disponible" },
      {
        label: "GitHub Actions",
        ok: exists(".github/workflows/ci.yml") || exists(".github/workflows/ci.yaml"),
        required: false,
        detail: "CI recommandée",
      },
      {
        label: "Handoff de déploiement généré",
        ok: handoffGenerated,
        detail: handoffGenerated ? "generated/deployment-handoff.md présent" : "À générer avec npm run deploy:handoff",
      },
    ],
    actions: [
      "Exécuter `npm run deploy:handoff`.",
      "Lire `generated/deployment-handoff.md` : variables Vercel, callbacks Google, cron, SEO et services activés.",
      "Vérifier qu’aucun secret n’est commité et que le lockfile est présent.",
      "Ne pas ajouter de variables de paiement si aucun provider n’est encore activé.",
      "Conserver la distinction local, Preview et Production.",
    ],
    validate: "Exécuter `npm run deploy:check`; le handoff de base doit être prêt avant le staging.",
  },
  {
    n: 15,
    title: "Valider le staging Vercel avant toute Production",
    goal: "Créer une vraie Preview Vercel, la tester et l’approuver avant d’autoriser le déploiement Production.",
    role: "GitHub conserve le code et Vercel héberge le SaaS. Le staging permet de tester le vrai déploiement avant production.",
    benefit:
      "Cette phase apporte versionnement, CI/CD, previews et validation du SaaS dans un environnement proche de la production.",
    checks: [
      { label: "Deployment handoff", ok: exists("scripts/deployment-handoff.mjs"), detail: "Disponible" },
      {
        label: "Handoff généré",
        ok: handoffGenerated,
        required: false,
        detail: handoffGenerated ? "generated/deployment-handoff.md présent" : "À générer avec npm run deploy:handoff",
      },
      {
        label: "Staging Vercel approuvé",
        ok: exists("generated/staging-approval.json"),
        detail: exists("generated/staging-approval.json")
          ? "Rapport d’approbation présent"
          : "Production bloquée tant que staging:approve n’a pas réussi",
      },
    ],
    actions: [
      "Exécuter `npm run deploy:handoff` pour préparer les variables GitHub/Vercel réellement utilisées par le projet.",
      "Pousser le projet sur GitHub sans `.env*` ni secrets.",
      "Exécuter `npm run staging:check`, puis créer la Preview avec `npm run staging:deploy` ou pousser une branche Git non-production.",
      "Exécuter `npm run staging:test -- --url=https://...vercel.app`, puis tester réellement navigation, auth, base, email, responsive, SEO et fonctions métier.",
      "Après validation humaine, exécuter `npm run staging:approve -- --url=https://...vercel.app`. Toute modification du commit impose un nouveau staging.",
      "Vérifier `npm run deploy:production:check`; ne jamais contourner ce gate avant Production.",
      "Ne configurer les providers de paiement que dans la Phase 17 si le SaaS en a réellement besoin.",
    ],
    validate:
      "`npm run staging:approve` doit réussir et `npm run deploy:production:check` doit passer. Sans approbation staging du commit courant, la Production reste bloquée.",
  },
  {
    n: 16,
    title: "Configurer Upstash Redis (OPTIONNEL)",
    goal: "Décider si ce SaaS a besoin d’un cache Redis/serverless et d’un rate limiting distribué pour réduire les lectures répétées vers Neon et stocker les états temporaires.",
    role: "Upstash Redis est une couche rapide de cache et de données temporaires. Neon reste la source de vérité métier : Upstash ne remplace pas PostgreSQL et ne doit pas contenir les données critiques comme seule copie.",
    benefit:
      "Cette phase peut réduire la charge et la latence sur les lectures fréquentes, centraliser le rate limiting entre instances Vercel et conserver des états temporaires avec TTL.",
    checks: [
      {
        label: "Décision Upstash",
        ok: config?.upstashEnabled === false || config?.upstashEnabled === true,
        required: true,
        detail: upstashOk
          ? "Redis REST configuré"
          : config?.upstashEnabled
            ? "Activé mais variables incomplètes"
            : "Optionnel — non activé",
      },
      {
        label: "Variables Redis",
        ok: !config?.upstashEnabled || upstashOk,
        required: true,
        detail: upstashOk ? "URL + token présents" : "UPSTASH_REDIS_REST_URL / TOKEN absents",
      },
      { label: "Helper cache", ok: exists("lib/cache/upstash.ts"), detail: "Cache TTL + fallback Neon disponible" },
    ],
    actions: [
      'Si le SaaS n’a pas besoin de cache/rate limiting distribué : exécuter `npm run upstash:setup -- --none`, puis `npm run setup-saas:mark -- --phase=16 --status=skipped --note="Upstash non utilisé"`.',
      "Si Upstash est utile : exécuter `npm run upstash:setup`, créer une base Redis dans Upstash Console et copier REST URL + REST TOKEN directement dans `.env.local` sans les coller dans le chat.",
      "Exécuter `npm run upstash:check` puis `npm run upstash:check:online` pour tester réellement la connexion.",
      "Utiliser Upstash seulement pour cache, rate limits, verrous/états temporaires et données recalculables. Conserver Neon comme source de vérité.",
      "Pour les entrées de cache, définir un TTL. Si le cache est utilisé comme cache, l’éviction peut être activée côté Upstash.",
      "Avant production, recopier les variables Upstash dans Vercel uniquement si cette phase a été activée.",
    ],
    validate:
      "La phase peut être SKIPPED. Si activée, `npm run upstash:check:online` doit réussir avant production et `/api/readyz` doit signaler Redis OK.",
  },
  {
    n: 17,
    title: "Décider et configurer les paiements (OPTIONNEL)",
    goal: "Juste avant la mise en ligne, décider si ce SaaS a réellement besoin d’un fournisseur de paiement. Un SaaS sans paiement peut ignorer cette phase.",
    role: "Les fournisseurs de paiement permettent d’encaisser en ligne par Mobile Money ou carte, mais ils sont totalement optionnels.",
    benefit:
      "Si le SaaS vend quelque chose, cette phase ajoute checkout, webhooks, réconciliation et tests sandbox. Sinon elle est simplement ignorée.",
    checks: enabledProviders.length
      ? [
          ...providerChecks.map((p) => ({
            label: `${p.label} (${p.readiness})`,
            ok: p.ok,
            detail: `${p.present}/${p.total} variables requises configurées`,
          })),
          {
            label: "PAYMENT_WEBHOOK_BASE_URL",
            ok: webhookBaseOk,
            detail: webhookBaseOk ? "Configurée" : "À configurer pour les tests webhooks",
          },
          {
            label: "Tests sandbox/ngrok validés",
            ok: false,
            detail: "À valider manuellement après succès/échec/replay",
          },
        ]
      : [
          {
            label: "Décision paiements",
            ok: false,
            detail: "Optionnel — décider ici si le SaaS a besoin de paiements, sinon marquer la phase skipped.",
          },
        ],
    actions: enabledProviders.length
      ? [
          "Renseigner les clés sandbox des providers sélectionnés directement dans `.env.local`.",
          "Exécuter `npm run payments:routes`.",
          "Exécuter `npm run cron:generate` pour préparer le cron Vercel de réconciliation (optionnel tant que les paiements sont désactivés).",
          "Terminal A : `npm run dev`.",
          "Terminal B : `npm run payments:ngrok`.",
          "Terminal C : `npm run payments:local`, puis `npm run payments:local:apply`.",
          "Tester succès, échec, annulation, pending/retard, signature invalide et replay du même webhook.",
          'Après tests réussis, marquer la phase passée avec `npm run setup-saas:mark -- --phase=17 --status=passed --note="paiements sandbox testés"`.',
        ]
      : [
          'Si ce SaaS N’A PAS besoin de paiement : exécuter `npm run payments:setup -- --none`, puis `npm run setup-saas:mark -- --phase=17 --status=skipped --note="SaaS sans paiement"`.',
          "Si ce SaaS A besoin de paiement : exécuter `npm run payments:setup` seulement maintenant, choisir les providers nécessaires, puis renseigner leurs clés sandbox.",
          "Tester ensuite les webhooks avec ngrok avant toute clé live.",
        ],
    validate: enabledProviders.length
      ? "Tous les providers activés doivent être testés en sandbox/ngrok avant le live."
      : "La phase peut être explicitement SKIPPED pour un SaaS sans paiement.",
  },
  {
    n: 18,
    title: "Configurer Cloudflare pour le domaine/DNS (OPTIONNEL)",
    goal: "Décider si le domaine et/ou le DNS du SaaS seront gérés avec Cloudflare. Cette phase est facultative et ne concerne pas Cloudflare R2.",
    role: "Cloudflare peut gérer ou fournir le domaine et le DNS du SaaS. Son utilisation est facultative.",
    benefit:
      "Il peut centraliser le domaine/DNS et éventuellement servir de couche réseau devant Vercel, sans être nécessaire au fonctionnement du SaaS.",
    checks: [
      {
        label: "Décision Cloudflare",
        ok: false,
        detail: "Optionnel — utiliser Cloudflare pour le domaine/DNS ou marquer cette phase skipped.",
      },
    ],
    actions: [
      'Si tu ne veux PAS utiliser Cloudflare : exécuter `npm run cloudflare:setup -- --none`, puis marquer la phase `skipped` avec `npm run setup-saas:mark -- --phase=18 --status=skipped --note=\"Cloudflare non utilisé\"`.',
      "Si tu veux utiliser Cloudflare : exécuter `npm run cloudflare:setup` puis suivre le guide généré dans `generated/cloudflare-setup.md`.",
      "Pour un domaine acheté ou géré chez Cloudflare : préparer le domaine, puis utiliser les enregistrements DNS demandés par Vercel pour le domaine custom. Ne jamais inventer une adresse A/CNAME : reprendre exactement les valeurs affichées par Vercel pour ce projet.",
      "Si le proxy Cloudflare gêne une validation de domaine/SSL, utiliser temporairement le mode DNS only jusqu’à validation complète, puis re-tester avant d’activer un proxy.",
      "Ne jamais ajouter de token API Cloudflare dans le chat. Cette phase domaine/DNS n’exige aucun token API dans le kit.",
      'Après validation réelle du domaine/DNS, marquer la phase passée avec `npm run setup-saas:mark -- --phase=18 --status=passed --note=\"Cloudflare domaine/DNS validé\"`.',
    ],
    validate:
      "La phase est soit SKIPPED (Cloudflare non utilisé), soit PASSED après validation réelle du domaine/DNS. L’absence de Cloudflare n’est jamais bloquante.",
  },
  {
    n: 19,
    title: "Configurer Cloudinary pour les uploads d’images (OPTIONNEL)",
    goal: "Décider si le SaaS a besoin d’uploads d’images. Cloudinary est facultatif et ne doit jamais bloquer un SaaS sans médias uploadés.",
    role: "Cloudinary gère l’upload, le stockage, la transformation et la diffusion d’images. Son utilisation est facultative.",
    benefit:
      "Il est utile pour avatars, photos produits ou médias utilisateurs tout en gardant les secrets d’upload côté serveur.",
    checks: [
      {
        label: "Décision Cloudinary",
        ok: false,
        detail:
          "Optionnel — activer Cloudinary seulement si le SaaS a besoin d’uploads d’images, sinon marquer cette phase skipped.",
      },
      {
        label: "Variables Cloudinary",
        ok: all([
          configured(env.CLOUDINARY_CLOUD_NAME),
          configured(env.CLOUDINARY_API_KEY),
          configured(env.CLOUDINARY_API_SECRET),
        ]),
        required: false,
        detail: all([
          configured(env.CLOUDINARY_CLOUD_NAME),
          configured(env.CLOUDINARY_API_KEY),
          configured(env.CLOUDINARY_API_SECRET),
        ])
          ? "Cloud name + API key + API secret présents; upload réel encore à tester"
          : "Non configuré",
      },
    ],
    actions: [
      'Si le SaaS n’a PAS besoin d’upload d’images : exécuter `npm run cloudinary:setup -- --none`, puis `npm run setup-saas:mark -- --phase=19 --status=skipped --note="Cloudinary non utilisé"`.',
      "Si le SaaS A besoin d’upload d’images : exécuter `npm run cloudinary:setup` puis suivre `generated/cloudinary-setup.md`.",
      "Renseigner CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY et CLOUDINARY_API_SECRET directement dans `.env.local`; ne jamais envoyer l’API secret dans le chat.",
      "Lancer l’app et tester `POST /api/uploads/images` avec un utilisateur connecté : une image valide doit réussir, SVG/fichier >10 MB/non-image/sans session doivent être refusés.",
      "Après validation en staging, ajouter les variables Cloudinary nécessaires dans Vercel Production; Preview seulement si le projet en a besoin.",
      'Après un vrai upload réussi, marquer la phase passée avec `npm run setup-saas:mark -- --phase=19 --status=passed --note="Cloudinary uploads testés"`.',
    ],
    validate:
      "La phase est soit SKIPPED pour un SaaS sans upload d’images, soit PASSED après un vrai test d’upload et des cas de refus sécurité.",
  },
  {
    n: 20,
    title: "Finaliser production, domaine et Search Console",
    goal: "Valider le vrai domaine HTTPS et les intégrations externes avant de déclarer le SaaS prêt.",
    role: "Cette phase finalise le vrai domaine HTTPS, Search Console et les derniers contrôles de production.",
    benefit:
      "Elle apporte la validation finale : domaine public, indexation Google, Production Doctor et test global de conformité des fichiers du kit.",
    checks: [
      {
        label: "Production Doctor prêt",
        ok: doctorReady,
        detail: doctorReady
          ? "Verdict READY"
          : doctorGenerated
            ? `Verdict ${doctorReport?.verdict || "inconnu"} — corriger avant production`
            : "À exécuter après staging/domaine",
      },
      {
        label: "Search Console vérifiée",
        ok: false,
        required: false,
        detail: "Toujours NON VÉRIFIÉE automatiquement avant connexion au vrai domaine",
      },
    ],
    actions: [
      "Confirmer que `npm run deploy:production:check` passe pour le commit courant. Si le code a changé depuis le staging, refaire Preview + tests + approbation.",
      "Déployer en Production uniquement via `npm run deploy:production` ou après un gate équivalent explicitement validé.",
      "Configurer le domaine custom Vercel et HTTPS avec le fournisseur DNS choisi (Cloudflare ou autre).",
      "Mettre à jour les callbacks OAuth avec le vrai domaine et, uniquement si des paiements sont activés, mettre à jour leurs webhooks providers.",
      "Lancer `npm run doctor:production` puis `npm run doctor:production:online`.",
      "Dans Google Search Console, vérifier la propriété Domain via DNS puis soumettre `/sitemap.xml`.",
      "Tester un partage réel de lien pour vérifier l’image Open Graph.",
      "Lancer `npm run conformity:check` pour le contrôle final de conformité des fichiers, scripts et règles du kit.",
      "Ouvrir `generated/conformity-report.md` et corriger tout FAIL avant de considérer le parcours terminé.",
    ],
    validate:
      "`npm run deploy:production:check` passe, le Production Doctor est satisfaisant, les flux externes sont testés et `npm run conformity:check` retourne PASS sans anomalie bloquante.",
  },
  {
    n: 21,
    title: "Préparer Android / iPhone — WebView connectée au SaaS (OPTIONNEL)",
    goal: "Après la mise en production du SaaS Web, décider si une app Android/iPhone WebView connectée au SaaS en ligne est nécessaire, puis préparer les projets natifs sans casser le Web.",
    role: "Cette phase crée un conteneur Capacitor WebView qui ouvre le SaaS Next.js déjà déployé en HTTPS. Le backend reste hébergé et conserve les secrets, la base, les emails et les paiements.",
    benefit:
      "Elle permet de publier rapidement le SaaS en Android/iPhone en réutilisant le site en ligne, tout en gardant la partie mobile complètement optionnelle et réversible.",
    checks: config?.mobileAppEnabled
      ? [
          {
            label: "Mobile App activée",
            ok: true,
            detail: (config.mobileApp?.platforms || []).join(" + ") || "plateformes non définies",
          },
          {
            label: "URL production HTTPS",
            ok: /^https:\/\//.test(String(config.mobileApp?.productionUrl || "")),
            detail: config.mobileApp?.productionUrl || "URL manquante",
          },
          {
            label: "Préparation Capacitor",
            ok: config.mobileApp?.prepared === true && exists("capacitor.config.ts"),
            detail: config.mobileApp?.prepared ? "Projet natif préparé" : "À préparer",
          },
        ]
      : [{ label: "Mobile App optionnelle", ok: true, detail: "Désactivée — le SaaS reste Web-only et conforme" }],
    actions: config?.mobileAppEnabled
      ? [
          "Exécuter `npm run mobile:check`, `npm run validation:zod-check` et `npm run security:release` avant la génération native.",
          "Exécuter `npm run mobile:app:install` pour installer Capacitor uniquement dans ce projet activé.",
          "Exécuter `npm run mobile:app:prepare`, puis `npm run mobile:app:check`.",
          "Tester Android avec Android Studio et un appareil réel; tester iOS avec Xcode sur macOS et un iPhone réel.",
          "Vérifier Safe Area, clavier, retour Android, liens externes, OAuth/session, paiements/redirections, mode hors connexion, navigation basse éventuelle, permissions minimales et absence de secrets dans le bundle.",
          "Préparer les sources haute définition : logo, icône app, splash, captures Android, captures iPhone et visuel store si requis.",
          "Avant publication, vérifier les politiques Play Store/App Store en vigueur et les exigences de confidentialité/achats numériques.",
        ]
      : [
          "Si aucune application mobile n’est nécessaire, ne rien installer : `mobileAppEnabled=false` est un état valide.",
          "Pour confirmer explicitement le mode Web-only : `npm run mobile:app:configure -- --none`.",
          "Pour activer plus tard : `npm run mobile:app:configure -- --app-id=com.entreprise.app --app-name=Mon-SaaS --url=https://app.exemple.com --platforms=android,ios`.",
          "Lire `docs/mobile/mobile-app-pipeline.md` avant activation.",
        ],
    validate: config?.mobileAppEnabled
      ? "`npm run mobile:app:check` doit réussir et les builds natifs doivent être testés sur appareils réels avant soumission aux stores."
      : "SKIPPED implicitement : le pipeline mobile est optionnel et le SaaS Web reste complet sans lui.",
  },
];

const computerUseAssistByPhase = {
  1: "Ouvrir le dashboard local du kit et vérifier visuellement qu’il se charge sans erreur bloquante.",
  2: "Utiliser réellement le Browser Subagent pour ouvrir la documentation Browser d’Antigravity; après la Phase 3, les preuves basculent sur localhost et /api/health.",
  3: "Après npm install, rafraîchir le dashboard local et vérifier que package-lock.json passe au vert.",
  4: "Après le wizard, rafraîchir le dashboard et vérifier que l’identité/configuration affichée correspond aux choix effectués.",
  5: "Le Browser Subagent peut guider dans Neon; après configuration, ouvrir /api/readyz et confirmer que la DB est healthy.",
  6: "Tester les écrans login/register/reset/2FA dans le navigateur et vérifier leurs états loading/error/success.",
  7: "Tester les flux Resend/Google avec le navigateur; l’utilisateur garde la saisie des identifiants/MFA.",
  8: "Tester les protections visibles (Turnstile si activé) et vérifier les endpoints health/readiness sans exposer de secret.",
  9: "Utiliser Banani MCP pour observer les écrans, puis vérifier dans le navigateur les pages reproduites au fur et à mesure.",
  10: "Comparer le plan aux écrans Banani, puis si le CRUD Clients est utilisé tester liste, création, fiche, modification, suppression et isolation entre deux comptes.",
  11: "Tester chaque écran aux viewports 320/360/390/430/768/1024/1440 et valider navigation, clavier, overflow et touch targets.",
  12: "Ouvrir les pages publiques, inspecter title/description/canonical/Open Graph et vérifier robots.txt + sitemap.xml.",
  13: "Après tests CLI, utiliser le navigateur pour smoke-test /api/health, /api/readyz et les principaux parcours UI.",
  14: "Ouvrir le handoff généré et utiliser le navigateur uniquement pour guider les dashboards externes nécessaires, sans révéler les secrets.",
  15: "Tester la Preview Vercel dans le navigateur sur mobile et desktop, puis exécuter staging:approve avant toute Production.",
  16: "Si Upstash est activé, guider la création Redis, puis vérifier /api/readyz après le test REST PING. Aucun token ne doit apparaître dans le chat.",
  17: "Si paiements activés, tester checkout sandbox, retour succès/échec/pending et replay webhook; ne jamais déclencher un paiement live sans accord explicite.",
  18: "Si Cloudflare utilisé, guider le DNS dans le navigateur mais demander confirmation avant tout changement critique/achat; vérifier ensuite le domaine.",
  19: "Si Cloudinary utilisé, tester un upload réel et les refus de sécurité depuis l’UI, sans afficher CLOUDINARY_API_SECRET.",
  20: "Tester le domaine final, HTTPS, Open Graph, robots, sitemap et Search Console; garder les validations externes NON VÉRIFIÉES tant qu’elles ne sont pas observées.",
  21: "Si l’app mobile est activée, utiliser Android Studio/Xcode et des appareils réels pour les vérifications natives. Si elle est désactivée, ne rien installer et conserver le Web-only.",
};

for (const phase of phases) {
  phase.state = phaseState(phase.checks);
  const saved = progress?.phases?.[String(phase.n)];
  if (["passed", "skipped"].includes(saved?.status)) {
    phase.state = "green";
    phase.savedValidation = saved;
  }
}
const next = phases.find((p) => p.state !== "green") || null;
const greenCount = phases.filter((p) => p.state === "green").length;

let report = `# Africa SaaS Kit — /setup-saas\n\n`;
report += `**Progression : ${greenCount}/${phases.length} phases validées**\n\n`;
report += `> ${icon.green} terminé · ${icon.yellow} partiel · ${icon.red} à faire · ${icon.unverified} vérification externe/non automatisable\n\n`;
report += `## Feuille de route complète\n\n`;
for (const p of phases) {
  report += `- ${icon[p.state]} **Phase ${p.n} — ${p.title}**${p.savedValidation ? " _(validée localement)_" : ""}\n`;
  report += `  - _${p.role}_\n`;
}
report += "\n";

if (next) {
  report += `---\n\n# ${icon[next.state]} Phase ${next.n} — ${next.title}\n\n`;
  report += `## À quoi sert cette phase ?\n\n${next.role}\n\n`;
  report += `## Ce que cela apporte au SaaS\n\n${next.benefit}\n\n`;
  report += `## Objectif de la phase\n\n${next.goal}\n\n`;
  report += `## État actuel\n\n`;
  for (const c of next.checks) {
    const st = c.ok ? icon.green : c.required === false ? icon.unverified : icon.red;
    report += `- ${st} **${c.label}** — ${c.detail}\n`;
  }
  report += `\n## Ce que tu dois faire maintenant\n\n`;
  next.actions.forEach((a, i) => {
    report += `### Étape ${i + 1}\n${a}\n\n`;
  });
  report += `## Assistance Computer Use pour cette phase\n\n${computerUseAssistByPhase[next.n] || "Utiliser le Browser Subagent dès qu’une surface web ou visuelle peut être vérifiée."}\n\n`;
  if (!computerUseVerified && next.n > 2)
    report += `> ⚠️ Computer Use n’est pas encore marqué VERIFIED. Revenir à la Phase 2 avant de considérer les validations visuelles comme fiables.\n\n`;
  report += `## Validation de la phase\n\n${next.validate}\n\n`;
  report += `Quand c’est fait, relance **\`/setup-saas\`** (ou \`npm run setup-saas\`). L’IA doit recontrôler cette phase avant de passer à la suivante.\n`;
} else {
  report += `---\n\n# 🟢 Toutes les phases locales sont validées\n\nPasse aux tests externes/staging encore marqués NON VÉRIFIÉS, puis au Production Doctor online.\n`;
}

fs.mkdirSync(path.join(root, "generated"), { recursive: true });
fs.writeFileSync(path.join(root, "generated/setup-saas-report.md"), report);
fs.writeFileSync(
  path.join(root, "generated/setup-saas-report.json"),
  JSON.stringify(
    {
      version: kitVersion,
      generatedAt: new Date().toISOString(),
      greenCount,
      total: phases.length,
      nextPhase: next?.n || null,
      phases,
    },
    null,
    2,
  ),
);
console.log(report);
console.log("Rapports: generated/setup-saas-report.md + generated/setup-saas-report.json");

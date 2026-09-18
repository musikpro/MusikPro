# Refactor sécurité V0.9.6 — /security-saas

Cette version ajoute un audit de sécurité à la demande sans remplacer les gates existants.

## Contrats ajoutés

- Skill officiel `.agents/skills/security-saas/SKILL.md` pour la commande `/security-saas`.
- `npm run security-saas` pour l'audit statique complet.
- `npm run security-saas:online` pour compléter l'audit avec la preuve RLS/policies sur Neon/Postgres lorsque la connexion est disponible.
- `npm run security-saas:json` pour la sortie structurée.
- Rapports locaux `generated/security-saas-report.md` et `.json`.
- Affichage du dernier score/rang sur la page d'accueil locale du kit.
- Contrôle d'intégrité permanent de la commande, du skill et de l'intégration dashboard.

## Couverture

Secrets et clés API, `.env.local` et Git, variables publiques sensibles, Security Baseline, Zod côté client/serveur, validation serveur, RLS/policies statiques et live, middleware/auth, vérification email, rate limiting, planchers de versions sensibles et `npm audit` quand le lockfile est présent.

Un contrôle qui ne peut pas être prouvé reste `À VÉRIFIER`. Il n'est pas transformé en PASS.

## Validation de cette distribution

Les contrôles structurels suivants passent sur la V0.9.6 : intégrité du kit, contrat de version, inventaire des features, Security Baseline, Zod Validation Gate, Continuous Refactor Gate, Security Preflight, dependency floors, env contract, runtime, mobile-first Web, pipeline mobile WebView optionnel, premium icons, skeleton loading, hydration, SEO et deployment handoff.

La validation réelle de `npm audit`, du build Next.js, d'ESLint, TypeScript et Vitest nécessite les dépendances installées et un `package-lock.json`; le starter ne fabrique pas de faux résultat lorsque ces prérequis manquent.

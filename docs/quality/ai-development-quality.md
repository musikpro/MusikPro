# Qualité du développement assisté par IA

Cette règle complète les garde-fous existants du Africa SaaS Kit sans introduire un second système parallèle.

## Workflow obligatoire pour une fonctionnalité importante

**PLAN → SPEC → TEST → CODE → VERIFY**

Une fonctionnalité est considérée comme importante lorsqu'elle touche au moins un des domaines suivants : API publique/privée, base ou migration, authentification, permissions, paiement, upload, sécurité, multi-tenant, intégration fournisseur, pipeline mobile, ou lorsqu'elle modifie plusieurs responsabilités du kit.

Les petites corrections locales peuvent rester légères, mais doivent toujours respecter les tests et gates existants.

### PLAN / SPEC minimum

Avant le code, documenter :

- objectif et problème réel ;
- fonctionnalités existantes à réutiliser (`config/features.json`) ;
- périmètre et hors périmètre ;
- données/tables/migrations ;
- routes/API et contrats ;
- rôles/permissions et isolation tenant ;
- entrées non fiables et validation ;
- sécurité/secrets/rate limiting ;
- tests prévus et critères d'acceptation ;
- stratégie de rollback si le changement est risqué.

Commande :

```bash
npm run feature:plan -- ma-feature
npm run feature:plan-check
```

Le plan est créé sous `docs/plans/` et peut être versionné. Le pointeur local de travail courant reste sous `.africa-saas/` et n'est pas commité.

## Documentation à jour

Toute montée de version d'une dépendance structurante doit forcer une nouvelle vérification de sa documentation officielle. Le registre est `config/documentation-sources.json`.

```bash
npm run docs:freshness-check
```

Une version installée différente de `reviewedVersion`, une URL invalide ou une date trop ancienne bloque le gate.

## Handoff de contexte entre agents/sessions

Les règles permanentes vivent dans `CLAUDE.md`. L'état courant du travail est séparé et peut être régénéré sans secrets :

```bash
npm run context:handoff
```

Le résultat `generated/project-handoff.md` contient la version, les features, la feature en cours, l'état des tests et les fichiers modifiés — jamais les valeurs de `.env.local`.

Avant de reprendre un travail existant, l'agent lit ce handoff s'il est présent.

## Commandes dangereuses

Voir `docs/security/agent-safety.md`. Une opération destructive n'est jamais exécutée seulement parce qu'un agent peut le faire.

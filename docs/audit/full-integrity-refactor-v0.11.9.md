# Africa SaaS Kit V0.11.9 — Rapport d’intégrité et de refactorisation

Date de l’audit : 2026-10-03

## Objectif

Auditer la V0.11.8 sans supprimer de fonctionnalité existante, corriger les incohérences réelles, améliorer la fiabilité de l’installation et rendre les rapports/voyants plus honnêtes sans ajouter de service obligatoire.

## Problèmes réels détectés et corrigés

### 1. Contrat Node.js trop permissif

Le kit déclarait encore `engines.node >=20.9.0` dans plusieurs contrôles, alors que le CLI Better Auth `auth` 1.7+ utilisé par le projet exige Node.js 22.12 ou plus récent. Cela pouvait produire une installation considérée « compatible » puis faire échouer `auth:generate` ou d’autres commandes du CLI.

Correction :

- `package.json#engines.node` → `>=22.12.0` ;
- ajout de `.nvmrc` avec `22` ;
- centralisation de la lecture du contrat dans `scripts/lib/runtime-contract.mjs` ;
- `first-run`, `install:check`, `dependencies:check`, `/setup-saas` et le dashboard dérivent maintenant la version requise depuis `package.json` ;
- `dependencies:contract` refuse une future régression incompatible.

Documentation officielle revue : https://better-auth.com/docs/concepts/cli

### 2. Types Node désalignés du runtime

Le starter utilisait `@types/node` 26.x alors que le runtime supporté est Node 22.x. Cela peut autoriser TypeScript à accepter des API absentes du runtime cible.

Correction : `@types/node` est aligné sur `22.20.5`, même major que le runtime supporté.

### 3. Modules optionnels affichés comme erreurs

Upstash et Playwright sont explicitement optionnels, mais leur absence pouvait encore apparaître en rouge/`FAIL` dans le dashboard/Production Doctor.

Correction :

- absence complète d’Upstash → orange/WARN ;
- configuration Upstash partielle → rouge/FAIL ;
- Playwright absent → orange/WARN ;
- un module explicitement optionnel n’est plus un échec bloquant du Production Doctor ;
- `readiness:ui-check` protège désormais cette sémantique contre une régression future.

### 4. Rapport d’intégrité trop optimiste sur certains états non vérifiés

Plusieurs scripts retournaient un code 0 pour signifier « structure correcte mais runtime non vérifié » ; le rapport consolidé les comptait auparavant comme PASS simples.

Correction : `kit:full-test` propage maintenant en `WARN` les états tels que :

- staging non approuvé ;
- handoff IA non généré ;
- parcours critiques non exécutés dynamiquement ;
- accessibilité navigateur non vérifiée ;
- Claude Code CLI non détecté ;
- pipeline/store mobile optionnel non activé ;
- audit `/security-saas` avec éléments « À VÉRIFIER ».

Le statut consolidé devient donc explicitement `STATIC_PASS_WITH_WARNINGS_DYNAMIC_PENDING` lorsque c’est la réalité.

### 5. Couverture du test global élargie sans rendre de service obligatoire

Le test global contrôle désormais aussi, comme checks locaux non bloquants lorsqu’ils ne sont pas configurés :

- `/security-saas` ;
- Computer Use OpenAI ;
- Computer Use Claude ;
- Banani MCP ;
- Upstash.

Cela améliore la visibilité de l’état du kit sans transformer ces intégrations optionnelles/non configurées en échecs de code.

## Résultats finaux

### Contrôles structurels

- `kit:integrity` : **PASS — 84 fichiers critiques** ;
- parité AGENTS/CLAUDE : **PASS — 47 rubriques** ;
- `dependencies:contract` : **PASS** ;
- `readiness:ui-check` : **PASS — 16 cartes Setup + 16 cartes Production** ;
- `kit:audit` : **PASS — 38/38 (100 %)** ;
- conformité : **283 PASS · 3 WARN · 0 FAIL** ;
- `/security-saas` : **15 PASS · 4 WARN · 0 FAIL**, 384 fichiers scannés, score 89 % ;
- `kit:full-test` : **27 PASS · 14 WARN · 0 FAIL · 7 PENDING**.

### Pourquoi il reste des WARN

Ils correspondent à des états réellement non configurés/non exécutés dans cette copie du starter :

- `.env.local` absent ;
- dépôt `.git` absent dans le ZIP ;
- lockfile absent avant première installation ;
- RLS Neon live non vérifié ;
- CRUD Clients en attente de l’import Banani ;
- app native Capacitor non activée ;
- staging non approuvé ;
- CLI Claude/Computer Use non vérifiés dans ce shell ;
- Banani/Upstash non configurés ;
- handoff IA non généré ;
- tests critiques live et accessibilité navigateur non exécutés.

Ces éléments ne sont pas transformés artificiellement en PASS.

### Tests dynamiques PENDING

Les 7 tests suivants nécessitent les dépendances installées :

1. Prettier/format ;
2. ESLint ;
3. TypeScript ;
4. Vitest ;
5. build Next.js ;
6. `npm audit --omit=dev` ;
7. sous-ensemble des parcours critiques.

Le registre npm n’est pas joignable depuis l’environnement de cet audit (`fetch failed`), donc `package-lock.json` et `node_modules` n’ont pas pu être générés honnêtement.

Après extraction sur une machine connectée :

```bash
nvm use
npm run install:preflight
npm run first-run:install
npm run kit:full-test
```

## Conclusion

La V0.11.9 est une refactorisation ciblée et non régressive. Aucun module métier, aucune route, aucun provider, aucune auth, aucun paiement, aucune fonctionnalité mobile/PWA et aucune règle AGENTS/CLAUDE n’a été supprimé. Les changements renforcent surtout la compatibilité de l’outillage, l’installation et la vérité des voyants/rapports.

# V0.8.28 — General Refactor & Security/Quality Gate

Cette refactorisation ajoute un garde-fou global permanent (`npm run refactor:check`) et corrige plusieurs points découverts pendant la revue générale du kit.

## Corrections appliquées

- **Frontière d’authentification dashboard** : `app/dashboard/layout.tsx` appelle maintenant `requireUser()` côté serveur. Une future page `/dashboard/*` hérite donc automatiquement d’une validation de session réelle, au lieu de dépendre uniquement du cookie lu par `proxy.ts`.
- **Réponses de paiement** : les objets `raw` retournés par les SDK/passerelles restent strictement côté serveur. `publicCheckoutResult()` ne renvoie au navigateur que les champs nécessaires.
- **Requêtes mutantes authentifiées** : checkout et upload disposent d’un contrôle d’origine/cross-site, d’un contrôle `Content-Type` et d’une limite déclarée de taille avant parsing.
- **Identifiants générés** : suppression de `Math.random()` dans le générateur SQL des routes de paiement ; utilisation de `crypto.randomUUID()`.
- **Headers dev/prod** : HSTS et `upgrade-insecure-requests` sont désormais réservés à la production afin de ne pas casser le développement HTTP local.
- **CI** : le workflow principal appelle la commande canonique `npm run ci:check`; le workflow sécurité appelle `npm run security:release`, ce qui réduit le risque de divergence entre contrôles locaux et GitHub Actions.
- **Server Actions** : le gate Zod vérifie aussi qu’une Server Action admin contient `requireAdmin()` et qu’une future action dashboard contient un garde d’authentification serveur.

## Garde-fou permanent

`npm run refactor:check` bloque notamment :

- perte des gardes serveur de `/dashboard` ou `/admin` ;
- exposition d’un payload `raw` de passerelle de paiement ;
- disparition des protections origin/taille/type sur les endpoints mutateurs de première partie ;
- réintroduction de `Math.random()` pour les identifiants/tokens du kit ;
- activation de HSTS/upgrade HTTPS en développement local ;
- dérive des workflows CI par rapport aux commandes canoniques ;
- `eval()` / `new Function()` dans le code applicatif.

Le gate est branché sur `verify:code`, `verify:production`, `ci:check` et `security:release`.

## Limite d’environnement du présent audit

Le ZIP source ne contient toujours pas `package-lock.json`. L’accès npm du workspace d’audit n’a pas permis de terminer `npm install --package-lock-only`. Par conséquent, `npm ci`, ESLint, TypeScript, Vitest, le build Next.js et `npm audit` ne peuvent pas être certifiés dans ce workspace. `conformity:check` garde volontairement ce point en échec bloquant jusqu’à génération/commit du lockfile.

### Dependency security floor

`npm run security:versions` bloque les régressions sous les versions minimales de sécurité revues pour Next.js, React, Drizzle ORM et Better Auth. Ce contrôle complète `npm audit`; il ne le remplace pas.

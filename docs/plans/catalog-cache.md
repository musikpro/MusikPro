# Catalog Cache

- Statut : EN COURS
- Créé : 2026-10-16
- Workflow : **PLAN → SPEC → TEST → CODE → VERIFY**

## Objectif / problème

La page d'accueil (`app/page.tsx`) et le layout du tableau de bord (`app/dashboard/layout.tsx`, donc chaque navigation) relisent en base, à chaque requête, les trois catalogues quasi statiques : styles musicaux, occasions et langues. Les mettre en cache (Data Cache de Next) avec une invalidation par tag déclenchée par chaque écriture admin, pour réduire les requêtes Neon et la latence, sans jamais servir un catalogue périmé après une modification.

## Réutilisation / anti-doublons

Même mécanisme que `lib/settings/playback.ts` et `lib/i18n/overlay-server.ts` : `unstable_cache` + `revalidateTag(tag, { expire: 0 })`. Aucun second système de cache. Les lecteurs `getActiveMusicStyles`, `getActiveOccasions`, `getActiveLanguageCatalog` gardent leur signature et leurs comportements (démo, valeurs de secours, erreurs).

## Périmètre

`lib/catalog-cache/{tags,cached,invalidate}.ts` ; les 3 lecteurs (`lib/music-styles/server.ts`, `lib/occasions/server.ts`, `lib/languages/server.ts`) ; invalidation dans les fonctions d'aide communes des actions admin (`music-styles`, `occasions`, `occasion-fields` — qui modifie `occasions.titleFieldId` et les blocs —, `languages`) et dans `lib/i18n/refresh-translations.ts` (qui réécrit les traductions des occasions et styles) ; tests dont un garde-fou statique ; registre `features.json`.

## Hors périmètre

Lectures spécifiques à la génération (`lib/ai/style-prompt.ts`, `lyrics-guidance-server.ts`, `lib/occasion-fields/server.ts`) qui lisent d'autres colonnes ou filtres ; pages admin (toujours lues en direct pour afficher l'état réel) ; `language_accents`, `country_languages`, devises ; aucun changement de schéma.

## Données / migrations

Aucune migration. Aucune donnée modifiée. Rollback : revert du commit, les lecteurs retrouvent leur lecture directe.

## API / contrats

Aucune route nouvelle ni modifiée. Signatures et valeurs de retour des trois lecteurs inchangées (mêmes types, même ordre, mêmes valeurs de secours). Tags : `catalog:music-styles`, `catalog:occasions`, `catalog:languages`.

## Auth / rôles / multi-tenant

Aucun changement : les catalogues sont globaux, déjà publics côté client (actifs uniquement). Le cache ne contient que ce que les lecteurs renvoient déjà aux clients, jamais de donnée utilisateur. L'invalidation n'a lieu que dans des Server Actions protégées par `requireAdmin()`.

## Entrées non fiables / sécurité

Aucune entrée utilisateur n'entre dans les clés de cache (clés fixes par catalogue) : pas d'empoisonnement de cache possible. Les erreurs de base ne sont JAMAIS mises en cache (le chargeur lève, le lecteur applique ensuite sa valeur de secours hors cache). Le mode démo contourne le cache. Durée de vie de secours de 10 minutes pour qu'une écriture oubliée ou directe en base (seed, migration) finisse par apparaître.

## Plan de tests avant code

- [ ] Nominal : 2 lectures = 1 requête ; après invalidation du tag, nouvelle requête avec les données à jour
- [ ] Erreur : base en panne → valeur de secours / erreur d'origine, et pas de mise en cache de l'échec
- [ ] Démo : contourne le cache
- [ ] Isolation : invalider un catalogue n'efface pas les autres
- [ ] Garde-fou statique : tout fichier qui écrit dans musicStyles/occasions/languages appelle invalidateCatalogs avec le bon catalogue
- [ ] Anti-régression : suite complète et gates PASS

## Critères d'acceptation

- [ ] Une modification admin (créer, modifier, activer, réordonner, supprimer, traduire) est visible sur l'accueil et le tableau de bord à la requête suivante
- [ ] Les requêtes de catalogue ne partent plus qu'à la première lecture puis à l'expiration/invalidation
- [ ] Comportements existants (démo, secours, erreurs) strictement identiques
- [ ] Gates PASS, aucune régression

## Plan d'implémentation

1. Tags + helpers `cachedCatalog` / `invalidateCatalogs`, tests
2. Branchement des 3 lecteurs (chargeur qui lève + enveloppe de secours)
3. Invalidation dans les 4 aides d'actions admin + refresh-translations
4. Garde-fou statique, registre, gates, mesure réelle en local, PR

## Rollback / réversibilité

Revert du commit. En urgence sans déploiement : l'expiration de 10 min purge le cache ; aucune donnée en base n'est concernée.

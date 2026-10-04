# Reprendre ou recommencer la création

- Statut : PLANIFIÉ (besoin précisé par le propriétaire le 2026-10-04 ; tous les points produit sont tranchés)
- Créé : 2026-10-04
- Workflow : **PLAN → SPEC → TEST → CODE → VERIFY**
- Source design : écran Banani « Reprendre ou recommencer la création » (`QMj5OQRWpKXU/screens/ResumeOrRestartCreation.jsx`, mobile), route `TBD`

## Objectif / problème

Besoin exprimé par le propriétaire : quand une personne a déjà avancé dans le parcours de création **sans avoir généré la chanson**, puis quitte (ferme l'application, change d'appareil, revient plus tard depuis le site ou depuis l'application), elle ne doit plus repartir de zéro. À son retour dans la création, on lui présente ce qu'elle a déjà fait et on lui propose : **Continuer ma chanson** (retour à l'étape où elle s'est arrêtée, pour générer avec ce qu'elle a déjà) ou **Recommencer de zéro**.

Écran Banani correspondant : « Reprendre ou recommencer la création » (résumé des étapes, aperçu des paroles, deux actions, avertissement de suppression).

## Constats sur l'existant (vérifiés dans le code)

- Brouillon actuel : `localStorage` seulement (`musikpro:creation-draft:v1:<id>`, `components/banani/DemoProvider.tsx`), limité à 6 choix (`occasion`, `genre`, `mood`, `language`, `voice`, `recipientRelation`) validés par `demoCreationChoicesSchema`. Restauré silencieusement, sans écran de choix.
- Histoire, détails et **paroles** vivent dans l'état client (`fields`, `details`, `fields.lyrics`) et sont perdus à la fermeture ; les paroles sont produites via `POST /api/ai/generate`.
- Pages de création : `app/dashboard/create/` (`genre`, `story`, `style`, `parameters`, `recipient`, `lyrics`, `lyrics/edit`, `lyrics/generating`, `pack`, `confirm`). L'entrée écrit déjà l'événement d'entonnoir `CREATION_STARTED`.
- Table `music_generation_jobs` : existe pour la génération audio, ne convient pas comme brouillon.

## Décisions

Décidées :

1. **Déclencheur** : à l'entrée dans la création (`/dashboard/create`), si l'utilisateur a une session de création **non terminée** (aucune chanson générée à partir de cette session). L'écran n'apparaît jamais sans session en cours.
2. **Stockage côté serveur (base)** : l'application mobile (WebView/Capacitor) et le site ne partagent pas le `localStorage` d'un navigateur ; seul un brouillon lié au compte permet de reprendre d'un contexte à l'autre. Le `localStorage` actuel reste un repli pour `/demo` et les utilisateurs non connectés.

Réponses du propriétaire (2026-10-04) :

3. **Paroles et coût (tranché : cas b)** : la génération de paroles n'est pas débitée à l'utilisateur (vérifié : `deductCredits` n'est appelé que dans `POST /api/songs/generate`) ; c'est le **fournisseur IA qui facture le propriétaire** à chaque génération. Conséquences : le brouillon conserve les paroles déjà générées pour qu'une reprise ne les régénère jamais (économie directe de coût IA) ; « Continuer » ne rappelle pas `/api/ai/generate` ; « Recommencer » demande une confirmation rappelant que les paroles seront perdues, **sans parler de crédits utilisateur**. Aucun remboursement ni écriture dans l'historique de crédits.
4. **Expiration : 30 jours** sans activité (`expires_at` prolongé à chaque sauvegarde). Brouillon périmé ignoré à la lecture et supprimé ; purge périodique sur le modèle des routes cron existantes (`app/api/cron/funnel-retention`), protégée par le secret cron.

## Réutilisation / anti-doublons

- Réutiliser le mécanisme de brouillon de `DemoProvider` (une seule source, pas de second système de brouillon) et `demoCreationChoicesSchema`.
- Réutiliser les composants de cartes/boutons du dashboard client, `Icon` (`components/banani/Icon.tsx`) et les skeletons de `components/ui/skeleton.tsx`.
- Vérifier `config/features.json` (aucune feature « brouillon » n'y figure aujourd'hui) puis y ajouter l'entrée si de nouveaux fichiers sont créés.
- Ne pas confondre avec les composants admin proposés par l'analyseur (bruit).

## Périmètre

- Nouvelle table de brouillon de création (une session active par utilisateur) : choix, histoire/détails, paroles, étape atteinte, dernière activité.
- Sauvegarde automatique (anti-rebond) pendant le parcours ; suppression du brouillon dès que la chanson est générée/confirmée.
- Écran de choix (mobile-first, 320–430 px d'abord) à l'entrée de la création : étapes terminées, aperçu des paroles, Continuer / Recommencer, avertissement.
- « Continuer » restaure l'état et redirige vers l'étape atteinte ; « Recommencer » supprime le brouillon (confirmation) et repart à la première étape.
- Textes traduisibles (`t()` + `npm run i18n:manifest`).

## Hors périmètre

- Paiement, crédits (sauf décision 3), génération audio, administration, schéma des collections.
- Aucune nouvelle table tant que la décision 2 reste « local ».
- Pas de traduction du contenu saisi par l'utilisateur (histoire, paroles).

## Données / migrations

- Migration Drizzle versionnée : table `creation_drafts` (id texte via `node:crypto`, `user_id` unique référencé `user.id` avec suppression en cascade, `step`, `data` jsonb borné, `updated_at`, `expires_at`).
- Enregistrer la table dans `config/security-rls.json` ; RLS : un utilisateur ne lit/écrit que son brouillon ; migration idempotente (branches Neon : voir mémoire « migrations avant déploiement »).
- Le brouillon `localStorage` v1 reste lu pour `/demo` et les utilisateurs non connectés ; aucune donnée existante n'est modifiée.
- Rollback : la table peut rester inutilisée ; retirer l'écran suffit.

## API / contrats

- `GET /api/creation-draft` (brouillon courant ou `null`), `PUT /api/creation-draft` (enregistre), `DELETE /api/creation-draft` (recommencer / après génération). `runtime = "nodejs"`, classées dans `config/security-routes.json`.
- Corps validé par Zod (`lib/validation/`) : tailles bornées (histoire, paroles), étape dans une liste fermée, aucun champ inconnu.
- Gardes habituelles des endpoints mutateurs : origine/cross-site, Content-Type, taille avant parsing, rate limiting. Lecture serveur directe depuis la page si possible (sans route GET).

## Auth / rôles / multi-tenant

- `requireUser()` ; ownership par `user_id` (jamais d'identifiant de brouillon fourni par le client). Aucun accès admin au contenu des brouillons hors support explicitement prévu.
- `/demo` : aucun brouillon serveur ; reste sur le repli local, sans injection dans un compte réel.

## Entrées non fiables / sécurité

- Toute donnée du brouillon (histoire, paroles) est non fiable : Zod côté serveur à l'écriture, affichage en texte (jamais de HTML).
- Histoire et paroles ne sont ni traduites ni modifiées (contenu utilisateur).
- Pas de secret dans le brouillon ; purge à l'expiration et à la suppression du compte.

## Plan de tests avant code

- [ ] Nominal : brouillon enregistré, retour dans la création → écran de choix avec étapes et aperçu ; « Continuer » restaure et ouvre la bonne étape.
- [ ] « Recommencer » : brouillon supprimé en base, création repart de la première étape.
- [ ] Reprise inter-appareils : brouillon créé dans un contexte, repris dans un autre avec le même compte.
- [ ] Aucun brouillon, ou chanson déjà générée : l'écran ne s'affiche pas, parcours inchangé.
- [ ] Entrée invalide (taille, étape inconnue, champ en trop) : refus Zod, rien d'écrit.
- [ ] Autorisation : un utilisateur ne lit/écrit/supprime jamais le brouillon d'un autre (test RLS et route).
- [ ] Expiration : brouillon périmé ignoré et supprimé.
- [ ] Anti-régression : `DemoProvider` et parcours de création existants inchangés ; 320/360/390/430 px sans scroll horizontal ; `i18n:check`.

## Critères d'acceptation

- [ ] Un utilisateur avec brouillon voit le choix Continuer / Recommencer, jamais une restauration silencieuse.
- [ ] « Recommencer » demande confirmation et supprime effectivement le brouillon.
- [ ] Les brouillons créés avant la mise en ligne restent lisibles.
- [ ] Aucun comportement existant cassé ; aucune icône d'étincelles ; skeleton et états vide/erreur présents.
- [ ] Gates PASS : `features:check`, `validation:zod-check`, `security:baseline`, `refactor:check`, `typecheck`, `test`, `mobile:check`, `ui:icons-check`, `i18n:check`, `accessibility:check`.

## Plan d'implémentation

1. Décisions figées : paroles facturées au propriétaire par le fournisseur IA (aucun débit utilisateur), expiration à 30 jours.
2. Écrire les tests (schéma Zod, repository, routes, RLS).
3. Migration + schéma Drizzle + `config/security-rls.json`.
4. Repository serveur partagé et routes `/api/creation-draft`.
5. Sauvegarde automatique côté client dans le parcours (additive, avec repli local).
6. Écran de choix + `loading.tsx` + branchement à l'entrée de `/dashboard/create` ; suppression du brouillon à la génération.
7. Traductions, `config/features.json`, `config/security-routes.json`, `config/zod-validation.json`.
8. Gates (`features:check`, `validation:zod-check`, `security:baseline`, `security:db-check`, `refactor:check`, `typecheck`, `test`, `mobile:check`, `ui:icons-check`, `accessibility:check`), vérification navigateur aux 7 viewports, staging approuvé, puis production.

## Rollback / réversibilité

Retirer l'écran et le branchement : le parcours revient au comportement actuel (brouillon local). La table et les routes inutilisées n'ont aucun effet. Aucune donnée existante n'est modifiée.

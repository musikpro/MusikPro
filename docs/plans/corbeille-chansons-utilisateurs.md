# Corbeille chansons et utilisateurs

- Statut : EN COURS
- Créé : 2026-10-10
- Workflow : **PLAN → SPEC → TEST → CODE → VERIFY**

## Objectif / problème

Supprimer une chanson ou un utilisateur depuis le tableau de bord propriétaire est aujourd'hui définitif. Une suppression faite par inadvertance doit pouvoir être annulée : les éléments supprimés passent par une corbeille, restaurables, puis sont purgés automatiquement après un délai réglable (30 jours par défaut, séparément pour les chansons et les utilisateurs).

## Réutilisation / anti-doublons

- `discover-library` : la suppression de chanson (`lib/admin/song-delete.ts`) est remplacée par une mise en corbeille ; mêmes nettoyages (Découvrir, lien public, mis en avant, Tendances) mais réversibles.
- `lib/account/purge-user-data.ts` : réutilisé pour la purge définitive d'un compte.
- Cron : même modèle que `app/api/cron/funnel-retention` (`verifyCronRequest`), planifié dans `vercel.json`.
- Composants : `AdminActionForm`, `AdminTabs`, `AdminDeleteUserButton`-like (confirmation), page « Paramètres généraux ».

## Périmètre

- Bouton « Ajouter les chansons des administrateurs à Découvrir » déplacé de Générations vers Paramètres > Général (boîte « Chansons des administrateurs dans Découvrir »).
- Chansons : suppression = instantané JSON dans `trashed_songs` puis retrait des tables actives (aucune lecture existante n'est modifiée) ; restauration = réinsertion.
- Utilisateurs : suppression = compte suspendu (banni, sessions révoquées) + ligne `trashed_users` ; masqué de la liste Utilisateurs ; restauration = levée de la suspension. Crédits, abonnements et historique restent intacts jusqu'à la purge.
- Page `/admin/corbeille` (onglets Chansons / Utilisateurs) : restaurer, supprimer définitivement, délai restant.
- Réglage `trash_settings` (Paramètres > Général) : jours de conservation des chansons et des utilisateurs.
- Cron quotidien `/api/cron/purge-trash`.

## Hors périmètre

- Suppression de compte en libre-service par le client (Apple 5.1.1) : reste immédiate et définitive.
- Fichiers audio chez l'hébergeur : non supprimés par la purge (inchangé).
- Pas de corbeille pour les autres catalogues.

## Données / migrations

Migration `0080_trash.sql` (idempotente) : tables `trash_settings`, `trashed_songs`, `trashed_users` + droits `musikpro_service`. Classées dans `config/security-rls.json` (serveur uniquement). Rollback : supprimer les tables ; aucun changement aux tables existantes.

## API / contrats

Server Actions admin (Zod, `requireAdmin`) : `deleteSong` (devient mise en corbeille), `restoreSong`, `purgeSong`, `deleteUser` (devient mise en corbeille), `restoreUser`, `purgeUser`, `setTrashRetention`. Route cron `GET|POST /api/cron/purge-trash` (secret cron).

## Auth / rôles / multi-tenant

Super Admin requis pour la corbeille des utilisateurs (comme la suppression actuelle) ; administrateur pour les chansons. La purge ne supprime jamais un compte administrateur.

## Entrées non fiables / sécurité

Identifiants bornés par Zod ; confirmation côté interface pour la suppression définitive ; audit des actions ; cron protégé par `CRON_SECRET` ; délais bornés (1 à 365 jours).

## Plan de tests avant code

- [x] Bornes du délai de conservation (défaut, minimum, maximum, valeur invalide)
- [x] Calcul d'échéance et de jours restants
- [x] Validation Zod des identifiants
- [x] Anti-régression : lint, typecheck, suite de tests, gates du kit

## Critères d'acceptation

- [ ] Supprimer une chanson la place en corbeille et la retire de Découvrir, du compte client et de la page d'accueil ; la restaurer rétablit tout
- [ ] Supprimer un utilisateur le suspend, le masque de la liste, et il se restaure avec ses crédits
- [ ] Purge automatique après le délai réglé ; réglage modifiable dans Paramètres > Général
- [ ] Aucun comportement existant cassé ; gates pertinents PASS

## Plan d'implémentation

1. Schéma, migration et registres.
2. Logique serveur (`lib/trash/*`), actions, cron.
3. Page Corbeille, entrée de menu, boîtes de réglage, déplacement du bouton Découvrir.
4. Tests, gates, vérification navigateur.

## Rollback / réversibilité

Les nouvelles tables sont additives. Revenir en arrière = rétablir l'ancienne suppression directe ; les éléments déjà en corbeille restent restaurables tant que les tables existent.

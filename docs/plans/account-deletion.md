# Suppression de compte en libre-service

- Statut : EN COURS
- Créé : 2026-10-06
- Workflow : **PLAN → SPEC → TEST → CODE → VERIFY**

## Objectif / problème

Apple (règle 5.1.1(v)) et Google Play (politique « Suppression de compte ») exigent que toute application qui permet de
créer un compte permette aussi de le supprimer **depuis l'application**, sans passer par le support. Aujourd'hui seul un
Super Admin peut supprimer un compte (`/admin/users`). Résultat attendu : l'utilisateur supprime lui-même son compte
et ses données depuis « Sécurité du compte », avec une confirmation par e-mail, sur le web comme dans les apps.

## Réutilisation / anti-doublons

- Better Auth 1.7.7 fournit déjà `POST /api/auth/delete-user` (option `user.deleteUser`), avec jeton de confirmation
  par e-mail, hooks `beforeDelete` / `afterDelete` et suppression des sessions : on **l'active**, on n'écrit pas un
  second moteur de suppression. Aucune nouvelle route.
- E-mails : `lib/email/auth-email-text.ts` (nouveau type `delete`) + `sendAuthEmail`, comme la réinitialisation.
- Écran : `components/banani/SecurityAccountScreen.tsx` (page `/dashboard/security`).
- La suppression par un administrateur (`app/admin/users/actions.ts`, `removeUser`) reste inchangée ; elle passe aussi
  par les mêmes tables mais pas par ce hook : le nettoyage des données métier est factorisé dans
  `lib/account/purge-user-data.ts` et appelé aussi par l'action admin.

## Périmètre

- Activer `user.deleteUser` avec `sendDeleteAccountVerification` (e-mail de confirmation, jeton valable 24 h).
- `beforeDelete` : refuse les comptes propriétaire/administrateur (suppression par un Super Admin uniquement), puis
  purge les données métier de l'utilisateur.
- Section « Supprimer mon compte » dans `/dashboard/security` : explication, boîte de confirmation, envoi de l'e-mail.
- Page publique `/account-deleted` (noindex) vers laquelle le lien de confirmation redirige.
- Règle de limitation de débit `/delete-user` côté Better Auth.
- Pages légales (confidentialité) : mention de la suppression et de la conservation comptable.

## Hors périmètre

- Suppression côté fournisseur audio (Musicful) des fichiers déjà générés : non maîtrisable, documenté.
- Suppression des comptes depuis l'admin : comportement inchangé.
- Export des données (RGPD) : chantier séparé.

## Données / migrations

Aucune migration : les clés étrangères existantes sont conservées.

| Donnée | Traitement à la suppression |
| --- | --- |
| `user`, `session`, `account`, `verification`, organisations/équipes (Better Auth) | supprimées (cascade existante) |
| `credits`, `subscriptions`, `creation_drafts` | supprimées (cascade existante) |
| `music_generation_jobs` (histoire, paroles, titre, URLs audio) | **supprimées** par la purge (sinon elles resteraient orphelines : FK `set null`) |
| `song_publications` (liens publics) | **supprimées** (pas de FK) |
| `discover_hidden_songs`, `landing_song_features` du compte | **supprimées** (références aux chansons du compte) |
| `payments`, `payment_attempts` | **conservés, anonymisés** (`user_id` mis à null par la FK) : obligation comptable |
| `funnel_events` | `user_id` mis à null (FK), purge existante à 180 jours |
| `audit_logs`, `security_events` | conservés (sécurité/preuve), sans lien FK |

La purge est exécutée en un seul `db.batch` (atomique) avant la suppression du compte ; si elle échoue, le compte
n'est pas supprimé et l'utilisateur reçoit une erreur.

## API / contrats

- `POST /api/auth/delete-user` (Better Auth) : corps `{ callbackURL }` → envoie l'e-mail ; avec `{ token }` supprime.
- `GET /api/auth/delete-user/callback?token=…&callbackURL=/account-deleted` (Better Auth) : supprime puis redirige.
- Aucune route `app/api/**` ajoutée ; la classification existante du catch-all Better Auth s'applique.

## Auth / rôles / multi-tenant

- Seul l'utilisateur connecté peut demander la suppression **de son propre compte** (session requise par Better Auth).
- Le jeton est envoyé à l'adresse e-mail du compte : fonctionne aussi pour les comptes Google sans mot de passe.
- Les rôles `admin` / propriétaire ne peuvent pas se supprimer eux-mêmes (évite de perdre l'accès au SaaS).
- La purge filtre toujours explicitement par `user_id` (service DB) : aucune donnée d'un autre compte n'est touchée.

## Entrées non fiables / sécurité

- `callbackURL` : Better Auth le vérifie contre `trustedOrigins` ; on ne passe que `/account-deleted`.
- Jeton aléatoire de 32 caractères, usage unique, expiration 24 h.
- Limitation de débit : 3 demandes par 5 minutes (règle personnalisée Better Auth, stockage base).
- Aucune donnée personnelle dans les journaux d'audit de suppression (identifiant seulement).

## Plan de tests avant code

- [ ] `purgeUserData` supprime les chansons, publications, masquages et mises en avant du compte, et seulement les siens.
- [ ] `beforeDelete` refuse un rôle admin/propriétaire et laisse passer un utilisateur normal ; échec de purge = erreur.
- [ ] Textes de l'e-mail `delete` : fr source + traduction, jamais d'URL dans le texte traduit.
- [ ] Écran : bouton désactivé tant que la confirmation n'est pas saisie ; erreur serveur affichée ; pas de double envoi.
- [ ] Anti-régression : suppression par l'admin inchangée ; tests existants verts.

## Critères d'acceptation

- [ ] Depuis `/dashboard/security`, « Supprimer mon compte » envoie un e-mail ; le lien supprime le compte et ses données.
- [ ] Après suppression, l'utilisateur est déconnecté, ne peut plus se connecter, et ses chansons ne sont plus accessibles
      (liens publics inclus).
- [ ] Les paiements restent en base sans lien vers l'utilisateur.
- [ ] Gates pertinents PASS (features, security baseline, Zod, refactor, i18n, icônes, accessibilité, tests).

## Plan d'implémentation

1. `lib/account/purge-user-data.ts` + tests.
2. Type d'e-mail `delete` + textes.
3. `lib/auth/index.ts` : `user.deleteUser` + règle de débit ; action admin : appeler la purge.
4. Écran « Supprimer mon compte » + page `/account-deleted`.
5. Pages légales, `config/features.json`, manifeste i18n, gates, essai bout en bout en local.

## Rollback / réversibilité

Désactiver `user.deleteUser.enabled` et masquer la section : aucune migration à annuler. Les suppressions déjà
effectuées sont définitives par nature (c'est leur but) ; l'e-mail de confirmation évite les suppressions accidentelles.

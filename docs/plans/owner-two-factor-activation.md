# Activation du double facteur propriétaire

- Statut : EN COURS (branche `feat/admin-two-factor`)
- Créé : 2026-10-07
- Workflow : **PLAN → SPEC → TEST → CODE → VERIFY**

## Objectif / problème

Le propriétaire lance le SaaS au public : l'accès au tableau de bord propriétaire doit exiger un second facteur, **réservé
aux comptes d'administration** (les clients ne sont jamais concernés), avec un moyen de récupération si le téléphone
d'authentification est perdu.

Le mécanisme existe déjà et reste derrière l'interrupteur `OWNER_2FA_ENABLED` (code de vérification par e-mail + application
d'authentification TOTP, codes de secours générés à l'activation). Manques constatés :

1. Les codes de secours sont générés mais **ne peuvent pas servir à la connexion** (l'écran de vérification ne propose que
   l'e-mail et le TOTP).
2. L'écran d'enregistrement affiche l'URI brute et les codes en texte simple : pas de clé lisible, ni copie, ni
   téléchargement, ni confirmation que les codes sont gardés.
3. Un propriétaire qui entre par la vérification e-mail (démarrage automatique) voit « 2FA activé » sans jamais avoir
   enregistré d'application ni reçu de codes de secours.
4. Pas de régénération des codes de secours.

## Réutilisation / anti-doublons

`config/features.json` → fonctionnalité d'authentification existante ; plugin Better Auth `twoFactor` + `ownerTwoFactor()`
(`lib/auth/owner-two-factor.ts`), écran `components/two-factor-challenge.tsx`, `components/two-factor-setup.tsx`,
`SecurityAccountScreen`. Aucun second mécanisme.

## Périmètre

- Écran de vérification : méthode « code de secours » (usage unique).
- Écran d'enregistrement : clé de configuration lisible + copie, lien `otpauth`, codes de secours (copie + téléchargement),
  confirmation obligatoire avant de valider.
- Propriétaire sans application enregistrée (même si l'e-mail est actif) : l'écran propose l'enregistrement TOTP + codes.
- Régénération des codes de secours (mot de passe demandé).
- Activation en production : `OWNER_2FA_ENABLED=true` (Production et Preview), après déploiement du code.

## Hors périmètre

Clients (aucun double facteur), clé de sécurité matérielle / passkeys, QR code (aucune dépendance ajoutée : clé de
configuration saisissable + lien `otpauth://`), désactivation du 2FA par le propriétaire lui-même.

## Données / migrations

Aucun : tables `two_factor` et colonne `user.two_factor_enabled` déjà présentes en production (vérifié en lecture seule).

## API / contrats

Routes Better Auth existantes uniquement (`/api/auth/two-factor/*`). `GET /two-factor/owner-context` renvoie en plus la
méthode `backup` quand une application TOTP est enregistrée. Aucune nouvelle route.

## Auth / rôles / multi-tenant

`/two-factor/enable|disable` restent refusés aux non-propriétaires (hook existant). Le démarrage automatique ne touche
que les comptes d'administration. `requireAdmin()` continue d'exiger `twoFactorEnabled`.

## Entrées non fiables / sécurité

Code de secours validé par Zod (longueur, jeu de caractères) côté client et serveur (Better Auth) ; limitation de débit
`/two-factor/*` : 5 requêtes / 60 s déjà en place ; les codes de secours sont stockés chiffrés par Better Auth ; jamais
journalisés ; affichés une seule fois.

## Plan de tests avant code

- [x] Schéma du code de secours : accepte `abcde-12345`, refuse vide, trop long, caractères interdits.
- [x] Schéma du contexte propriétaire : accepte la méthode `backup`.
- [x] Aide de génération du fichier de codes (contenu sans secret en dehors des codes).
- [x] Anti-régression : tests `owner-two-factor` (clients jamais concernés, rôles personnalisés), gates sécurité/Zod.
- [ ] Navigateur : écran d'enregistrement et de vérification (états, mobile).

## Critères d'acceptation

- [ ] Un propriétaire peut enregistrer une application, voir/copier/télécharger ses 10 codes, et doit confirmer.
- [ ] Un code de secours permet la connexion une fois, puis est consommé.
- [ ] Un client ne voit jamais l'écran, et `enable/disable` lui est refusé.
- [ ] Aucun comportement existant cassé ; gates pertinents PASS.

## Plan d'implémentation

1. Schémas Zod + test.
2. `owner-context` : méthode `backup`.
3. Écran de vérification : méthode code de secours.
4. Écran d'enregistrement / régénération (+ `totpConfigured` calculé côté serveur).
5. Vérification navigateur, déploiement code (interrupteur encore à `false`), puis activation de l'interrupteur.

## Rollback / réversibilité

Repasser `OWNER_2FA_ENABLED` à `false` (Vercel) et redéployer : le comportement revient à l'état précédent sans perte de
données (les enregistrements TOTP restent en base).

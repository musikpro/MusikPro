# Notifications push et centre de notifications réel

- Statut : EN COURS — étape A (notifications réelles dans l'app) codée ; étape B (envoi push) en attente de Firebase
- Créé : 2026-10-06
- Workflow : **PLAN → SPEC → TEST → CODE → VERIFY**

## Objectif / problème

Constat (inspection du code, 2026-10-06) :

1. **Aucune notification push** : pas de plugin `@capacitor/push-notifications`, pas de `google-services.json`
   (Android : `android/app/build.gradle` signale « Push Notifications won't work »), pas d'entitlement APNs sur iPhone.
2. **La cloche n'a aucune source réelle** : pour un vrai compte, `NotificationCenterScreen` affiche un état vide (les
   cinq notifications de `demoNotifications` ne sont montrées qu'en démo). Il n'existe ni table ni API ; les
   interrupteurs de `NotificationsSettingsScreen` sont un état local.

Résultat attendu : quand une chanson est prête (cas principal), l'utilisateur reçoit une notification sur son téléphone
(app fermée comprise), la cloche affiche l'historique réel, et les interrupteurs de réglage sont réellement pris en compte.

## Décisions à prendre (utilisateur)

| #   | Décision                 | Recommandation                                                                                                                                                                                                    |
| --- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Périmètre du premier lot | **Génération terminée uniquement.** « Likes » et « écoutes » n'ont pas d'événement serveur aujourd'hui ; concours/promotions = envoi admin (lot 2).                                                               |
| 2   | Compte Firebase          | À créer par l'utilisateur (projet Firebase, app Android `com.musikpro.app`). Fournit `google-services.json` (non secret) et une clé de compte de service (**secret**, à saisir dans Vercel, jamais dans le chat). |
| 3   | iPhone                   | Exige le compte Apple Developer payant (clé APNs + capacité Push). Android d'abord, iPhone ensuite.                                                                                                               |
| 4   | Notifications web (PWA)  | Hors périmètre du lot 1 (Web Push/VAPID = autre mécanisme).                                                                                                                                                       |

## Réutilisation / anti-doublons

- Lire `config/features.json` avant code : aucune feature « notifications » n'existe ; en ajouter une
  (`user-notifications`) avec `dependsOn` auth et génération réelle.
- Point d'émission : fin de génération déjà centralisée (`lib/ai/music-jobs.ts`, webhook `app/api/webhooks/musicgpt/[token]/route.ts`,
  rattrapage `app/api/cron/reconcile-music-jobs/route.ts`) → un seul helper `notifyUser()` appelé là, idempotent.
- Écrans existants conservés (`NotificationCenterScreen`, `NotificationsSettingsScreen`, `DemoToggle`) : on remplace la
  source de données, pas l'interface. `/demo` garde ses données de démonstration, isolées (règle « démo fidèle »).
- Détection native : `lib/mobile/native-runtime.ts` (`isNativeMobileApp`), comme `native-splash.ts`.

## Périmètre (lot 1)

- Tables Drizzle : `user_notifications` (id, user_id, type, titre, message, lien, lu, created_at, clé d'idempotence
  unique par `user_id` + `dedupe_key`), `push_devices` (id, user_id, token unique, plateforme, langue, created_at, last_seen),
  `notification_preferences` (user_id, types activés). Migration versionnée, RLS, classification `config/security-rls.json`.
- API (nodejs, Zod, session, rate limiting, gardes d'origine) : liste/lecture/marquer lu des notifications ;
  enregistrement/suppression d'un jeton d'appareil ; lecture/écriture des préférences. Classer dans `config/security-routes.json`
  et `config/zod-validation.json`.
- Envoi : FCM HTTP v1 (compte de service) pour Android ; APNs relayé par FCM pour iPhone (une seule intégration serveur).
  Suppression automatique des jetons invalides (`UNREGISTERED`).
- Client natif : `@capacitor/push-notifications` ; demande d'autorisation **au bon moment** (après la première chanson, pas au
  lancement) ; enregistrement du jeton ; toucher une notification ouvre la chanson (lien interne, passe par `openAppLink`).
- Android : `google-services.json` (plugin déjà prêt dans Gradle), permission `POST_NOTIFICATIONS` (Android 13+), icône et
  canal de notification.
- Textes : titres/messages via i18n (`translateForLocale`, langue enregistrée avec l'appareil) ; jamais le titre de la chanson traduit.
- Confidentialité : mettre à jour `/privacy`, `PrivacyInfo.xcprivacy`, `docs/mobile/store-privacy-declarations.md`
  (identifiant d'appareil = « Identifiants de l'appareil », fonctionnalité de l'app) et les formulaires boutiques.
- Suppression de compte : ajouter les trois tables à `lib/account/purge-user-data.ts`.

## Hors périmètre

- Likes/écoutes, concours, promotions (lot 2) ; Web Push ; notifications riches (images) ; e-mail transactionnel (existant, inchangé).

## Sécurité

- Un jeton appartient à un seul utilisateur (réassigné à la connexion d'un autre compte sur le même appareil).
- Le contenu envoyé ne contient aucune donnée sensible (pas d'e-mail, pas de paroles) ; lien relatif uniquement.
- Clé de compte de service : variable Vercel serveur, jamais `NEXT_PUBLIC_*`, jamais en Git.
- Idempotence : webhook rejoué ou rattrapage cron ne renvoie pas deux fois la même notification (`dedupe_key` = id de génération).
- Désactivation par l'utilisateur respectée côté serveur (pas seulement côté interface).

## Plan de tests avant code

- [ ] `notifyUser` : crée une ligne, envoie aux appareils, respecte les préférences, ne duplique jamais (clé d'idempotence).
- [ ] Jeton invalide renvoyé par FCM → appareil supprimé ; échec d'envoi n'empêche jamais la fin de génération.
- [ ] API : refus sans session, validation Zod, un utilisateur ne lit/modifie que ses notifications.
- [ ] Cloche réelle : liste vide (état vide), non lues, marquer lu ; `/demo` inchangée et jamais mélangée aux comptes réels.
- [ ] Émulateur Android : notification reçue app fermée, toucher ouvre la chanson (test sur le serveur local ou preview, jamais en générant en production).
- [ ] Anti-régression : suppression de compte purge les nouvelles tables ; gates features / security / Zod / i18n / icônes / mobile.

## Critères d'acceptation

- [ ] Fin de génération réelle → ligne en base + push reçu sur Android (app en arrière-plan et fermée).
- [ ] La cloche n'affiche plus aucune donnée factice pour un compte réel.
- [ ] Interrupteurs persistés et respectés par le serveur.
- [ ] iPhone : même parcours, validé seulement après compte Apple Developer et test réel (sinon NON VÉRIFIÉ).

## Rollback

Migration additive (3 nouvelles tables) ; désactiver l'appel à `notifyUser` et le plugin côté client suffit. L'ancienne cloche
démo ne doit pas être restaurée pour les vrais comptes.

## Avancement

- **Étape A (faite, sans compte externe)** : table `user_notifications` (migration 0069), `lib/notifications/*`,
  `GET /api/notifications`, `POST /api/notifications/read`, création à la fin de génération (`pollMusicJob`,
  donc aussi le rattrapage planifié), cloche réelle (liste, « Marquer tout », toucher = ouvrir), purge à la suppression
  de compte. Clé d'unicité : groupe de chansons.
- **Étape B (à faire après Firebase)** : `push_devices`, `notification_preferences`, plugin Capacitor, envoi FCM,
  `POST_NOTIFICATIONS`, déclarations de confidentialité.
- Reste à brancher : pastille « non lues » sur la cloche, interrupteurs de réglage réels (étape B).

# Mode Invité (parcours de création sans compte)

- Statut : EN COURS — plan validé ; phase 1 livrée (commit 0e9b287), phase 2 codée et vérifiée en local (voir « Avancement »)
- Créé : 2026-10-12
- Workflow : **PLAN → SPEC → TEST → CODE → VERIFY**

## Objectif / problème

Les visiteurs venus des publicités sur les réseaux sociaux abandonnent quand on leur demande de se connecter avant même de voir le produit. Résultat attendu : un visiteur ouvre un **lien invité**, remplit tout le parcours de création (occasion, histoire, destinataire, style, langue et voix) **sans compte**, et n'est invité à se connecter qu'au moment où il doit obtenir des crédits.

Parcours cible :

1. Pub → lien invité `/g/<slug>` → **destination choisie par le propriétaire pour chaque lien** :
   - **Formulaire de création** : le visiteur arrive directement à l'étape 1 (occasion). Recommandé pour une pub qui promet « crée ta chanson » : le moins d'écrans possible avant d'agir.
   - **Tableau de bord invité** : le visiteur arrive sur l'accueil (bouton « Créer une chanson », tendances publiques, offres), puis lance lui-même la création. Utile pour une pub qui présente le produit avant de pousser à créer.
2. Étapes 1 à 5 sans compte (choix, histoire, noms, style, langue/voix).
3. Clic sur « Générer les paroles » → **portail de connexion** (c'est là que le parcours actuel exige déjà des crédits, voir plus bas).
4. Connexion : bouton Google/Gmail en premier ; sinon e-mail en deux écrans (nom + e-mail, puis mot de passe). Jamais nom + e-mail + mot de passe sur le même écran.
5. Retour automatique sur le parcours, brouillon intact, puis achat de crédits (plateforme de paiement), retour, paroles, génération de la chanson.

Menu propriétaire : gérer les liens invités (créer, modifier, supprimer vers une corbeille ; suppression définitive uniquement depuis la corbeille).

## Réutilisation / anti-doublons

Inventaire fait dans le code (à réutiliser tel quel, rien de nouveau à inventer) :

- **État du parcours** : `components/banani/DemoProvider.tsx` (`persistenceId`, localStorage), `lib/validation/creation-draft.ts`, `lib/creation-draft/server.ts`, `CreationDraftSync`, table `creation_drafts` (feature `creation-draft-resume`).
- **Portail crédits existant** : `StepAdditionalParams.tsx` (`needsCredits`), `CreditsGateModal.tsx`, `buyCredits()`.
- **Auth** : `components/auth-form.tsx` (déjà en deux écrans identité → mot de passe en inscription), `lib/auth/native-google.ts`, `/auth/continue`, `goToAuthenticatedSpace`.
- **Paiement** : checkout `/api/payments/checkout`, webhook + `reconcilePayment` (idempotent), page `after-payment` avec sondage du solde. Aucun changement du pipeline de paiement.
- **Admin** : `AdminShell`, `AdminActionForm`, `AdminTabs`, `withAdminNotice`, modèle CRUD `app/admin/coupons/*`, patron corbeille `app/admin/corbeille/*` + `lib/trash/*` + cron `purge-trash`.
- **Mesure** : `funnel_events`, `writeFunnelEvent`, page `/admin/funnel`.
- **Mode démo `/demo`** : on ne le réutilise pas comme fonctionnalité (tout y est simulé), seulement son principe technique (réécriture dans `proxy.ts` + en-tête interne non falsifiable).
- À ajouter dans `config/features.json` : nouvelle entrée `guest-mode` (dépend de `creation-draft-resume`, `auth`, `payments`, `owner-trash`).

## Corrections et recommandations sur l'idée de départ

1. **Où placer le portail.** Les paroles ne débitent rien, mais `/api/ai/generate` exige déjà un solde d'au moins 2 crédits (le débit de 2 crédits a lieu à la génération de la chanson). Le portail se place donc **avant « Générer les paroles »**, pas à la toute dernière étape : cela évite d'offrir des générations IA payantes par le propriétaire à des anonymes. L'invité voit quand même presque tout le parcours.
2. **Navigateurs intégrés des réseaux sociaux.** Les pubs ouvrent le lien dans le navigateur intégré de Facebook, Instagram ou TikTok. Google refuse la connexion OAuth dans ces navigateurs intégrés (erreur `disallowed_useragent`). À vérifier par un test réel. Prévu : détection de ces navigateurs, mise en avant de la connexion par e-mail, et message « Ouvrir dans votre navigateur » pour Google.
3. **Libellé « Gmail ».** Demande : « Créer un compte avec Gmail » et « Se connecter avec Gmail » à la place de Google. Prévu tel quel, mais à votre arbitrage : le bouton connecte tout compte Google (pas seulement une adresse Gmail) et les règles de marque de Google demandent normalement « Google ». Le logo Google reste. Le libellé passe par `t()`.
4. **Numéro de téléphone.** Il n'est pas demandé à l'inscription aujourd'hui, seulement à l'étape paiement. Recommandation : ne pas l'ajouter à l'inscription (un champ de moins), le garder à l'étape paiement.
5. **E-mail à vérifier en production.** Après une inscription par e-mail, aucune session n'existe tant que le lien reçu n'est pas cliqué. Le lien doit ramener sur le parcours (paramètre `next`) et le brouillon doit survivre : voir Données.
6. **Aucun appel IA anonyme.** Toutes les routes métier restent derrière une session. L'invité n'appelle que des catalogues publics.

## Périmètre

- Table et CRUD des liens invités + onglet corbeille + entrée de menu admin.
- **Choix de la destination par lien** (formulaire de création ou tableau de bord invité), modifiable à tout moment dans l'admin, avec un aperçu du lien complet à copier.
- Route publique `/g/<slug>` et mode « invité » du tableau de bord, limité à l'accueil invité et aux écrans de création (étapes 1 à 5).
- **Accueil invité** : version allégée de l'accueil connecté (voir « Accueil invité » plus bas).
- Persistance du brouillon invité jusqu'à la connexion, puis migration vers `creation_drafts`.
- Portail de connexion, paramètre `next` en liste blanche, libellés Gmail, détection des navigateurs intégrés.
- Suivi : événements d'entonnoir avec utm/referrer, compteurs par lien.
- i18n complète des nouveaux textes (`t()`, `npm run i18n:manifest`).

## Hors périmètre

- Aucun changement du pipeline de paiement, des webhooks, des crédits ni des offres.
- Aucune ouverture anonyme de `/api/ai/generate`, `/api/songs/*`, `/api/music/*`, `/api/payments/*`.
- Pas de connexion Apple (incohérence existante : bouton présent, fournisseur absent côté serveur) ; non touchée ici.
- Pas de refonte du mode démo `/demo`.
- Pas d'ajout de numéro de téléphone à l'inscription.
- Les modifications locales non commitées de la connexion Apple ne font pas partie de ce chantier.

## Données / migrations

Migration additive `0085_guest_links.sql` (la dernière existante est 0084) :

- Table `guest_links` : `id` (uuid via `node:crypto`), `slug` (unique, minuscules, 3 à 40 caractères), `label`, `destination` (`create` ou `dashboard`, défaut `create`, contrainte `CHECK`), `active`, `note`, compteurs agrégés optionnels, `created_by`, `created_at`, `updated_at`, `deleted_at`, `deleted_by`. Suppression logique par `deleted_at` : plus simple qu'un instantané JSON et sans table `trashed_*` supplémentaire.
- Colonne additive `guest_links_retention_days` (défaut 30) dans `trash_settings` ; purge automatique via le cron existant `purge-trash`.
- `GRANT SELECT, INSERT, UPDATE, DELETE` à `musikpro_service`, blocs idempotents (`IF NOT EXISTS`, `DO $$ … EXCEPTION`).
- Brouillon invité : étendre le schéma pour inclure histoire, noms et prononciations, car le localStorage actuel ne garde que six choix. Stockage localStorage sous `musikpro:creation-draft:v1:guest:<visiteur>` ; à la connexion, envoi vers `creation_drafts` (PUT existant). Pas de nouvelle table pour le brouillon invité.
- Cookie `musikpro_guest` (httpOnly, SameSite=Lax, durée limitée) : identifiant visiteur aléatoire + id du lien + utm. Jamais de donnée personnelle dedans.
- Rollback : migration purement additive ; supprimer l'entrée de menu, la route `/g` et la réécriture suffit, la table peut rester vide.

## API / contrats

- `GET /g/[slug]` (page/route publique) : vérifie que le lien existe, est actif et n'est pas dans la corbeille ; sinon 404. Pose le cookie visiteur, écrit un événement d'entonnoir (avec la destination), puis redirige **selon `destination`** : `create` → `/guest/create` (étape 1), `dashboard` → `/guest` (accueil invité). La destination est lue en base à chaque visite, jamais dans l'URL, donc modifier le lien dans l'admin change aussitôt le comportement des pubs déjà diffusées. Slug validé par Zod (regex stricte).
- `/guest/*` : réécriture dans `proxy.ts` vers `/dashboard` (accueil) et `/dashboard/create/*` avec un en-tête interne (même technique que `x-musikpro-demo-route`, supprimé des requêtes entrantes donc non falsifiable). Limitée à une liste blanche de chemins (accueil invité, étapes 1 à 5 et ressources) ; tout autre chemin redirige vers `/login`.
- `requireUser()` : tolérance invité uniquement quand l'en-tête interne est présent ET le cookie visiteur valide ; jamais pour songs, crédits, paiement, admin.
- `/auth/continue?next=` et `callbackURL` de `auth-form.tsx` : `next` accepté seulement parmi une liste blanche de chemins internes (ex. `/dashboard/create/pack`), jamais d'URL absolue.
- Admin : Server Actions `createGuestLink`, `updateGuestLink`, `trashGuestLink`, `restoreGuestLink`, `purgeGuestLink` avec la signature `AdminActionState`, `requireAdmin()`, Zod, `writeAuditLog`.
- Éventuelle route d'événement invité (`POST /api/guest/event`) seulement si nécessaire ; sinon événements écrits côté serveur dans `/g/[slug]` et au portail. Si créée : classée dans `config/security-routes.json`.

## Accueil invité (destination « tableau de bord »)

- Réutilise l'accueil existant avec le mode `guest` du `DemoProvider` : titre d'accueil sans prénom, grand bouton « Créer une chanson » (mène à `/guest/create`), section Tendances (données publiques déjà affichées), accès aux offres de crédits en lecture seule.
- Masqué ou remplacé pour l'invité : « Mes chansons » (carte « Connecte-toi pour retrouver tes chansons »), solde de crédits réel, notifications, menu compte, envoi push. Aucune donnée d'un autre utilisateur n'est lue.
- Le bouton de connexion est visible en permanence (en-tête) ; le portail de connexion reste déclenché par « Générer les paroles ».
- États vide/erreur/hors ligne et squelettes de chargement (règle du projet) ; mobile d'abord, de 320 à 1440 px.
- Les écrans « Découvrir » et le lecteur de chansons publiques ne sont pas ouverts à l'invité en phase 2 (à décider si utile pour la conversion).

## Auth / rôles / multi-tenant

- Invité : lecture des catalogues publics (occasions, styles, relations, offres) uniquement. Aucune donnée utilisateur, aucune mutation métier.
- Admin : tout le CRUD des liens via `requireAdmin()`.
- Après connexion : le brouillon est rattaché à `user_id` ; les contrôles de propriété existants s'appliquent.
- RLS : `guest_links` classée dans `config/security-rls.json` (lecture publique réalisée côté serveur via le rôle de service, écriture réservée à l'admin).

## Entrées non fiables / sécurité

- Zod serveur sur : slug, label, note, paramètres `next`, utm (longueur bornée, caractères autorisés), id visiteur.
- Limitation de débit par IP et par visiteur sur `/g/[slug]` et sur la route d'événement ; clé sans `userId`. Plafond strict, car des bots pubs peuvent frapper.
- Turnstile conservé sur l'inscription et la connexion par e-mail ; non requis sur la simple entrée du lien.
- CSP inchangée (nonce, pas de script inline, pas de traceur tiers) ; `frame-ancestors 'none'` empêche toute intégration en iframe.
- Garde d'origine et de taille sur toute mutation. `next` et URLs de retour paiement restent sur l'origine de l'application.
- Aucun secret côté client ; aucune donnée personnelle dans le cookie invité ni dans les paramètres d'URL.
- Capacitor : le wrapper charge `musikpro.net`, le cookie et le localStorage vivent dans la WebView ; à tester sur appareil.

## Plan de tests avant code

- [ ] Nominal : lien actif → parcours invité jusqu'à l'étape 5 sans compte → portail → Google → retour sur le parcours avec toutes les saisies → achat → paroles → chanson.
- [ ] Nominal e-mail : portail → nom + e-mail → écran mot de passe → e-mail de vérification → lien → retour sur le parcours avec brouillon.
- [ ] Lien avec destination `create` → arrive à l'étape 1 ; destination `dashboard` → arrive sur l'accueil invité, et le bouton « Créer une chanson » ouvre l'étape 1 sans connexion.
- [ ] Changer la destination d'un lien dans l'admin → la visite suivante suit la nouvelle destination (aucun cache obsolète) ; valeur invalide refusée par Zod et par la contrainte `CHECK`.
- [ ] Accueil invité : aucune donnée utilisateur, « Mes chansons » remplacé par l'invitation à se connecter, aucun appel API protégé dans la console réseau.
- [ ] Lien inexistant, désactivé ou en corbeille → 404 ; slug invalide refusé par Zod.
- [ ] Invité qui tente `/dashboard/credits`, `/dashboard/songs`, `/admin`, une route `/api/songs/*` ou `/api/ai/generate` → refusé (redirection ou 401).
- [ ] En-tête interne envoyé par un client → ignoré.
- [ ] `next` malveillant (URL absolue, `//`, `javascript:`) → ignoré, destination par défaut.
- [ ] Brouillon invité : histoire, noms et prononciations survivent à la redirection OAuth, et sont migrés vers `creation_drafts` ; un brouillon existant du compte n'est pas écrasé sans choix (écran reprendre/recommencer existant).
- [ ] Navigateur intégré (user-agent Facebook, Instagram, TikTok) : Google n'est pas présenté comme seule option, message d'ouverture dans le navigateur.
- [ ] Corbeille : supprimer → disparaît de la liste active et apparaît en corbeille ; restaurer ; purger définitivement uniquement depuis la corbeille ; purge automatique après le délai.
- [ ] Anti-régression : parcours connecté inchangé, `/demo` inchangé, paiement, webhook et crédits inchangés, pas de décalage d'hydratation (`translate()`), `disableBehavior` : sans lien actif, rien ne change.
- [ ] Gates : `features:check`, `validation:zod-check`, `security:baseline`, `refactor:check`, `typecheck`, `test`, `mobile:check`, `ui:icons-check`, `i18n:manifest` puis `i18n:check`, `kit:integrity`, `security:db-check` (Neon accessible).
- [ ] Vérification navigateur sur 320, 360, 390, 430, 768, 1024 et 1440 px, clavier et focus ; marquer NON VÉRIFIÉ ce qui n'a pas été fait.

## Critères d'acceptation

- [ ] Un visiteur sans compte ouvre un lien actif et arrive, sans passer par la page de connexion, à la destination choisie pour ce lien : formulaire de création ou tableau de bord invité.
- [ ] Le propriétaire choisit et modifie la destination de chaque lien dans l'admin, et le changement s'applique à la visite suivante.
- [ ] Aucune route coûteuse ou liée aux données utilisateur n'est accessible à un invité.
- [ ] Les saisies de l'invité survivent à la connexion (Google et e-mail) et à l'e-mail de vérification.
- [ ] Jamais nom, e-mail et mot de passe sur le même écran ; Google/Gmail proposé en premier.
- [ ] Libellés « Gmail » (ou la formule validée) sur connexion et inscription, traduits en EN/ES/PT via le mécanisme existant.
- [ ] Le propriétaire crée, modifie, désactive et supprime un lien ; la suppression envoie en corbeille ; la purge définitive n'existe que depuis la corbeille ; chaque action affiche un toast.
- [ ] Les visites, portails atteints, inscriptions et paiements sont visibles par lien dans l'admin.
- [ ] Aucun comportement existant cassé ; gates pertinents PASS.

## Plan d'implémentation

Phases indépendantes et réversibles :

1. **Phase 1 — Admin des liens.** Migration 0085 (avec `destination`), repository `lib/guest-links/*`, page `/admin/guest-links` (liste, création, modification, activation, **sélecteur de destination « Formulaire de création » / « Tableau de bord invité »**, copie du lien complet), menu, onglet corbeille, cron de purge, audit, toasts, `features.json`, `security-rls.json`, `zod-validation.json`. Valeur immédiate et sans effet sur les clients.
2. **Phase 2 — Entrée et mode invité.** Route `/g/[slug]` avec redirection selon `destination`, cookie visiteur, réécriture `proxy.ts` avec liste blanche (accueil invité + création), `requireUser` tolérant l'invité sur l'accueil et les seuls écrans de création, accueil invité allégé, mode `guest` du `DemoProvider` (catalogues réels, solde 0, aucun appel métier), brouillon invité étendu.
3. **Phase 3 — Portail et connexion.** Portail avant « Générer les paroles », paramètre `next` en liste blanche, libellés Gmail, détection des navigateurs intégrés, retour après vérification d'e-mail, migration du brouillon vers `creation_drafts`.
4. **Phase 4 — Mesure et durcissement.** Événements d'entonnoir et utm par lien, compteurs dans l'admin, limitation de débit, tests de bout en bout, vérification sur appareil (WebView Capacitor).

Chaque phase se termine par ses gates et sa propre revue ; aucune ne dépend d'un déploiement de la suivante. Déploiement : staging validé puis production, comme d'habitude.

## Rollback / réversibilité

- Phase 1 : retirer l'entrée de menu ; la table reste sans effet.
- Phases 2 et 3 : désactiver les liens (ou supprimer la réécriture et la route `/g`) rétablit exactement le parcours actuel ; le brouillon serveur existant reste la source pour les comptes.
- Migration additive uniquement, aucune donnée existante modifiée ; pas de suppression de table.

## Questions ouvertes pour le propriétaire

1. Portail avant « Générer les paroles » (recommandé, protège le coût IA) ou paroles gratuites pour tous les invités (coût à votre charge, plafonné) ?
2. Libellé exact : « Gmail » comme demandé, ou « Google » conforme aux règles de marque ?
3. Un seul lien invité ou plusieurs (un par campagne), avec compteurs séparés ? Le plan suppose plusieurs.
4. Délai de conservation en corbeille des liens : 30 jours comme les chansons ?
5. Le lien invité doit-il pouvoir présélectionner une occasion (ex. Amour) selon la campagne ?
6. Destination par défaut d'un nouveau lien : formulaire de création (recommandé pour des pubs d'action) ou tableau de bord invité ?
7. Sur l'accueil invité, voulez-vous aussi « Découvrir » (chansons publiques) en lecture, ou seulement Tendances et le bouton de création ?

## Avancement

- **Phase 1 (admin des liens)** : livrée sur `feat/guest-mode` (commit `0e9b287`). Migration 0085 appliquée à la branche Neon `development` ; à appliquer à la production avant tout déploiement du code.
- **Phase 2 (entrée et mode invité)** : codée et vérifiée en local. Vérifié : redirections selon la destination, cookie invité, liste blanche du proxy (chemins autorisés/interdits, en-tête forgé, cookie falsifié), session périmée avec cookie invité, accueil invité sans donnée de compte, parcours jusqu'à l'étape 5, brouillon invité conservé au rechargement, portail provisoire sans aucun appel API protégé. Choix de conception : les URL restent en `/dashboard/...` (aucun préfixe `/guest`), le proxy admet le visiteur sur la liste blanche avec le cookie du lien.
- **Portail provisoire** : « Se connecter pour continuer » mène à `/login` ; le retour automatique au parcours, la reprise du brouillon après connexion et Google en premier arrivent en phase 3. Ne pas diffuser de lien invité en publicité avant la phase 3.
- **Phase 3 (portail et reprise)** : codée. Choix de conception : pas de paramètre `next` (risque de redirection ouverte, et `callbackURL` inchangés) ; le clic « Se connecter pour continuer » pose un cookie court `musikpro_guest_resume` ; `/auth/continue` ramène alors un client (jamais un administrateur) vers `/dashboard/create` ; `GuestDraftMigrate` verse le brouillon du navigateur vers `creation_drafts` (écran « Reprendre ou recommencer ») puis recharge une fois. Google reste en premier sur la page de connexion (libellé « Google », nom officiel) ; bandeau `GuestAuthNotice` (rassurance + avertissement et copie du lien dans les navigateurs intégrés Facebook/Instagram/TikTok). Le retour après vérification d'e-mail passe par le même `/auth/continue`. Non vérifié : connexion réelle de bout en bout et appareil réel.
- **Phase 4** : à faire.

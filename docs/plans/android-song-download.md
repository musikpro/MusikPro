# Android Song Download

- Statut : PLANIFIÉ
- Créé : 2026-10-06
- Workflow : **PLAN → SPEC → TEST → CODE → VERIFY**

## Objectif / problème

Deux défauts constatés sur l'application Android (Capacitor, WebView distante sur musikpro.net), reproduits sur émulateur :

1. **Téléchargement MP3 sans effet.** `downloadAudioFile` crée un lien `blob:` avec l'attribut `download`. Capacitor n'installe aucun `DownloadListener` : le fichier est récupéré par la page mais rien n'est enregistré (dossier Téléchargements vide). Résultat attendu : le MP3 est enregistré dans « Téléchargements » avec une notification Android, comme sur le site.
2. **Écran « Tu avais déjà commencé une chanson » réaffiché par le Retour d'Android.** Quand l'utilisateur est arrivé à l'étape « histoire » via « Continuer ma chanson », la touche/geste Retour le ramène à cet écran, alors que les boutons « Retour » / « Tableau de bord » de l'application le sautent déjà. Résultat attendu : après avoir choisi « Continuer », revenir en arrière affiche l'étape 1 (choix de l'occasion), jamais à nouveau l'écran de reprise.

## Réutilisation / anti-doublons

- `creation-draft-resume` : on étend le témoin existant `musikpro_resume_skip` (`lib/creation-draft/resume-skip.ts`) ; aucun nouveau mécanisme d'écran de reprise.
- `real-song-generation-journey` / `musicful-audio-generation` : source des `audioUrl` (table `music_generation_jobs`, `user_id` + `audio_url`) ; aucune nouvelle table.
- `song-public-link-sharing` : inchangé (le lien public reste sans option de téléchargement).
- Patron de route : `app/api/songs/[groupId]/cover/route.ts` (session Better Auth, `rateLimit`, Zod, réponses JSON d'erreur).

## Périmètre

- Nouvelle route `GET /api/songs/download` (session, Zod, limitation de débit, propriété de la chanson vérifiée en base) qui relaie le MP3 avec `Content-Disposition: attachment`.
- `lib/demo/audio-actions.ts` : sur Android natif uniquement (`Capacitor.getPlatform() === "android"`), `downloadAudioFile` déclenche une navigation vers cette route ; navigateur web et iOS gardent le chemin `blob:` actuel.
- `MainActivity.java` : `DownloadListener` qui confie le téléchargement au `DownloadManager` d'Android (cookies de session transmis, dossier Téléchargements, notification système).
- `AndroidManifest.xml` : `WRITE_EXTERNAL_STORAGE` limitée à `maxSdkVersion="28"` (Android 7 à 9 uniquement).
- `ResumeOrRestartCreation` : mémorise (sessionStorage) que l'utilisateur a choisi « Continuer » ; au retour sur l'écran de reprise, pose le témoin de saut et rafraîchit pour afficher l'étape 1.

## Hors périmètre

- Aucun changement de la génération, des crédits, des paiements, de la base ou des migrations.
- Pas de téléchargement du WAV, pas de téléchargement des chansons d'autres utilisateurs.
- iOS (le `DownloadListener` est propre à Android) : non traité ici.
- Comportement du Retour hors parcours de création : inchangé.

## Données / migrations

Aucun. Lecture seule de `music_generation_jobs` (colonnes `user_id`, `audio_url`, `title`, `status`). Pas de migration, pas de nouvelle table, donc rien à ajouter à `config/security-rls.json`.

## API / contrats

`GET /api/songs/download?url=<audioUrl>&name=<nom>`

- `url` : URL `https` d'une chanson de l'utilisateur ; `name` : nom de fichier souhaité (facultatif, assaini).
- 200 : flux du fichier, `Content-Type` du fichier source (`audio/mpeg`, `audio/mp4`…), `Content-Disposition: attachment; filename="…"; filename*=UTF-8''…`, `Cache-Control: private, no-store`.
- 400 paramètres invalides ; 401 non connecté ; 404 chanson introuvable pour cet utilisateur ; 429 trop de requêtes ; 502 source indisponible ; 503 limiteur indisponible.
- Aucun changement des contrats existants.

## Auth / rôles / multi-tenant

Session obligatoire. Le fichier n'est servi que si `music_generation_jobs` contient une ligne avec `user_id = session.user.id`, `audio_url = url` et `status = 'completed'`. Aucune URL arbitraire n'est relayée : la route n'est donc pas un proxy ouvert et ne peut pas être détournée pour atteindre un hôte interne (SSRF). Le fichier est lu avec `redirect: "error"`, sans cookies ni en-têtes de l'utilisateur.

## Entrées non fiables / sécurité

- Zod : `url` (https, longueur bornée), `name` (longueur bornée, caractères de chemin retirés) ; seule la valeur lue en base est utilisée pour la requête sortante.
- Rate limiting `rateLimit("songs:download:<user>:<ip>")`, échec fermé si le limiteur est indisponible, comme les autres routes songs.
- Délai maximal et taille maximale (garde-fou) sur la requête sortante ; pas de mise en cache.
- Route GET sans effet de bord : pas de garde « cross-site mutation », mais en-tête `Content-Disposition: attachment` et `X-Content-Type-Options: nosniff` pour qu'aucun contenu ne soit interprété comme page.
- Classification dans `config/security-routes.json` ; couverture Zod dans `config/zod-validation.json` si le gate l'exige.
- Natif : le `DownloadListener` ne traite que les URL `https` du domaine de l'application (`musikpro.net`), jamais une URL arbitraire.

## Plan de tests avant code

- [ ] Nominal : utilisateur connecté, chanson à lui → 200, en-têtes `attachment`, nom de fichier assaini, extension déduite du type.
- [ ] Entrée invalide : `url` absente / non https / trop longue → 400 ; `name` avec `../` ou guillemets → nom assaini.
- [ ] Autorisation : non connecté → 401 ; URL appartenant à un autre utilisateur ou inconnue → 404 (aucune requête sortante).
- [ ] Limitation de débit : 429 ; limiteur indisponible → 503.
- [ ] Source en erreur → 502 sans fuite de détail.
- [ ] Anti-régression web : hors Android natif, `downloadAudioFile` garde le chemin `blob:` (même résultat qu'avant).
- [ ] Android natif : `downloadAudioFile` navigue vers la route (mock `Capacitor.getPlatform`).
- [ ] Écran de reprise : après « Continuer », le retour sur l'écran de reprise pose le témoin et ne l'affiche pas ; sans « Continuer » préalable, il s'affiche comme avant ; le témoin ne survit pas à « Retour » / « Tableau de bord ».
- [ ] Émulateur Android : téléchargement réel dans « Téléchargements » (après déploiement de la route) ; Retour après « Continuer » → étape 1.

## Critères d'acceptation

- [ ] Sur l'émulateur, un MP3 apparaît dans Téléchargements (taille identique à la source) avec une notification.
- [ ] Sur le web et iOS, le téléchargement se comporte comme avant.
- [ ] Après « Continuer ma chanson », le Retour d'Android n'affiche plus l'écran de reprise.
- [ ] Aucune URL arbitraire ne peut être relayée par la route.
- [ ] Aucun comportement existant cassé ; gates pertinents PASS (`security:baseline`, `validation:zod-check`, `refactor:check`, `features:check`, `typecheck`, `lint`, `test`, `mobile:app:check`, `ui:icons-check`, `i18n:check`).

## Plan d'implémentation

1. Helpers purs et testés : construction du nom de fichier / en-tête `Content-Disposition`, lecture de la chanson de l'utilisateur par `audio_url`.
2. Route `app/api/songs/download/route.ts` + registres (`security-routes.json`, `features.json`, `zod-validation.json` si requis).
3. `downloadAudioFile` : branche Android native, chemin web inchangé.
4. `MainActivity.java` (`DownloadListener` → `DownloadManager`) et permission `WRITE_EXTERNAL_STORAGE` plafonnée à l'API 28.
5. Écran de reprise : témoin « continué » dans `resume-skip.ts` et `ResumeOrRestartCreation`.
6. Tests, gates, compilation Android, essais sur émulateur.

## Rollback / réversibilité

Changements additifs. Retirer la branche Android de `downloadAudioFile` et le `DownloadListener` rétablit exactement l'état actuel ; la route peut rester inutilisée ou être supprimée sans effet sur les données (aucune écriture, aucune migration). Le témoin « continué » vit dans `sessionStorage` et disparaît avec l'onglet.

## Extension iPhone

Dans l'application Capacitor iOS, `downloadAudioFile` lit le fichier via la même route (même origine, session de l'utilisateur) puis le remet à la feuille de partage iOS (`navigator.share({ files })`) : enregistrement dans Fichiers, AirDrop, WhatsApp. Safari iOS garde le téléchargement par lien `blob:`. Aucune nouvelle route ni dépendance. Rollback : retirer la branche `isIosNativeApp` de `lib/demo/audio-actions.ts`.

# Téléchargement des applications depuis le site

- Statut : CODÉ (branche `feat/app-downloads`, empilée sur la PR #78) — décisions prises le 2026-10-06 : Vercel Blob privé, page PWA pour l'iPhone, clé de signature générée localement ; limite 35 Mo strict (avertissement dès 30 Mo) ; la page /download propose la PWA d'abord (sans avertissement) puis l'APK en option
- Créé : 2026-10-06
- Workflow : **PLAN → SPEC → TEST → CODE → VERIFY**

## Objectif / problème

Le propriétaire ne peut pas (pour l'instant) ouvrir de compte Google Play Console ni Apple Developer. Il veut héberger
lui-même ses applications : depuis le tableau de bord propriétaire, il envoie le fichier de l'application ; un clic sur
le logo « Google Play » / « App Store » du site la télécharge, de façon sécurisée.

## Ce qui est possible, et ce qui ne l'est pas (à connaître)

| Plateforme  | Faisable ?                            | Comment                                                                                                                                                                                                                                                                                                                                                                                                         |
| ----------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Android** | **Oui**                               | Fichier **APK** téléchargé depuis le site puis installé par l'utilisateur (autorisation « installer des applis inconnues » demandée une fois par Android ; Play Protect peut afficher un avertissement « développeur inconnu », normal hors Play Store).                                                                                                                                                        |
| **iPhone**  | **Non, pas en téléchargement direct** | Apple interdit d'installer un fichier `.ipa` depuis un site au grand public : il faut l'App Store, TestFlight, ou un certificat entreprise/ad hoc (compte Apple Developer payant, 100 appareils max en ad hoc). Alternative sans compte : le site est déjà une **PWA** — « Partager → Sur l'écran d'accueil » donne une icône plein écran. Le bouton « App Store » mène alors à une page d'instructions claire. |

« Protégé contre le piratage » : un fichier public peut toujours être copié par n'importe qui. Ce qu'on protège
réellement : **l'intégrité** (seul le propriétaire peut publier ; empreinte SHA-256 affichée ; HTTPS ; signature de
l'APK par la clé du propriétaire — un APK modifié par un tiers ne s'installe pas comme mise à jour), **l'abus**
(débit limité, aucune exécution du fichier côté serveur) et **la valeur** (les comptes, crédits et générations restent
côté serveur : l'application n'est qu'un accès au site).

## Prérequis

1. **Clé de signature Android** (obligatoire) : aujourd'hui seul un APK « debug » existe (clé de test propre à la machine,
   et mises à jour impossibles d'une machine à l'autre). Créer un keystore de production, **le sauvegarder hors Git**
   (perte = impossible de mettre à jour les utilisateurs existants), configurer la signature `release` (`key.properties`
   ignoré par Git), compiler un APK `release`.
2. **Stockage du fichier** (~7–20 Mo) : voir décision 1.

## Décisions à prendre

1. **Stockage** : _Vercel Blob privé_ (recommandé : envoi direct du navigateur, pas de limite de 4,5 Mo des fonctions,
   téléchargement relayé par notre route donc contrôlé) — nécessite de créer un « Blob store » dans le compte Vercel et la
   variable `BLOB_READ_WRITE_TOKEN`. Alternative : Cloudinary « raw » (déjà configuré mais limite de taille de fichier à
   vérifier sur le plan actuel).
2. **iPhone** : page d'instructions PWA (recommandé) ou bouton masqué tant qu'il n'y a pas de compte Apple.
3. **Clé de signature** : je la génère localement (mots de passe aléatoires dans `android/key.properties`, ignoré par Git)
   et vous la sauvegardez, ou vous préférez la créer vous-même.

## Réutilisation / anti-doublons

- `/admin/mobile-apps` (onglets `AdminTabs`) : nouvel onglet **« Fichiers d'installation »** ; l'onglet « Liens des stores »
  reste (un lien Google Play configuré garde la priorité sur le téléchargement direct).
- `StoreBadges` / `StoreDownloadCard` (accueil, tableau de bord, menu mobile) : les logos existants pointent vers la route
  de téléchargement quand aucun lien de boutique n'est configuré et qu'une version est publiée ; sinon « bientôt disponible ».
- Pattern admin : `AdminActionForm` + toast, `requireAdmin()`, Zod, `writeAuditLog`.
- Outil `npm run mobile:version` pour numéroter chaque version publiée.

## Périmètre

- Table `app_releases` : id, plateforme (`android`), version, build, nom du fichier, taille, **SHA-256**, clé de stockage,
  notes de version, publié (oui/non), nombre de téléchargements, date, auteur. Une seule version « courante » par plateforme ;
  historique conservé pour revenir en arrière. Migration versionnée, `config/security-rls.json`.
- Admin : envoi direct du navigateur vers le stockage (jeton à usage unique émis par une Server Action `requireAdmin()`),
  puis **validation côté serveur** : fichier ZIP (`PK\x03\x04`), contient `AndroidManifest.xml`, taille bornée, SHA-256 calculé
  par le serveur ; refus et suppression du fichier sinon. Publier / dépublier / supprimer (avec confirmation), toast.
- Public : `GET /download/android` (route, pas d'URL de stockage exposée) : limitation de débit, `Content-Disposition:
attachment`, `Content-Type: application/vnd.android.package-archive`, `X-Content-Type-Options: nosniff`,
  `Cache-Control` adapté, compteur de téléchargements (sans donnée personnelle). Page `/download` (indexable) : version,
  taille, empreinte SHA-256, étapes d'installation (autoriser les sources inconnues), et section iPhone (PWA).
- Textes traduisibles (i18n), mobile-first, squelette de chargement, SEO (metadata, sitemap pour `/download`).

## Hors périmètre

- Distribution iPhone par fichier ; mises à jour automatiques dans l'app (l'utilisateur retélécharge) ; analyse antivirus
  tierce ; second CDN. Publication Play Store/App Store (reste possible plus tard, sans rien casser).

## Sécurité

- Envoi : admin uniquement (`requireAdmin()`), Zod, limites de taille/type, vérification magique + contenu du ZIP,
  SHA-256 serveur ; le jeton d'envoi est restreint (chemin, taille, type, durée).
- Aucun chemin ni URL de stockage fournis par le client ; identifiants de version générés avec `node:crypto`.
- Téléchargement : public mais limité en débit (par IP), fichier relayé depuis un stockage **privé**, jamais exécuté ni
  interprété, jamais de HTML servi ; réponse d'erreur générique sans détail interne.
- Journal d'audit de chaque publication / suppression ; aucun secret dans le client (`BLOB_READ_WRITE_TOKEN` serveur).
- CSP inchangée (téléchargement = navigation, pas de script tiers).

## Plan de tests avant code

- [ ] Validation de l'archive : accepte un vrai APK, refuse un fichier vide, un ZIP sans `AndroidManifest.xml`, un exécutable
      renommé, une taille hors bornes.
- [ ] Serveur : refus sans rôle admin ; SHA-256 recalculé et stocké ; une seule version courante ; dépublication.
- [ ] Route de téléchargement : 404 sans version publiée, en-têtes de sécurité, limitation de débit, compteur.
- [ ] Logos : lien boutique configuré prioritaire ; sinon route de téléchargement ; sinon « bientôt ».
- [ ] Anti-régression : `/admin/mobile-apps`, `StoreBadges`, gates features/security/Zod/refactor/i18n/icônes/accessibilité.

## Critères d'acceptation

- [ ] Le propriétaire envoie un APK signé depuis le tableau de bord, le publie, et le logo Google Play du site le télécharge.
- [ ] L'APK installé sur un téléphone se lance et se connecte (test émulateur + téléphone réel).
- [ ] Empreinte SHA-256 affichée = empreinte du fichier téléchargé.
- [ ] Un utilisateur non admin ne peut ni envoyer ni supprimer ; le stockage n'est jamais accessible directement.

## Rollback

Dépublier la version (les logos retombent sur « bientôt ») ; table et stockage peuvent rester inutilisés.

## Avancement (2026-10-06)

- Fait : table `app_releases` (migration 0071), inspecteur d'APK sans dépendance (archive ZIP, manifeste, paquet
  `com.musikpro.app`, bloc de signature ; validé sur le vrai APK release), couche serveur, route d'émission du jeton d'envoi
  (admin seulement), 3 Server Actions (enregistrer, publier/retirer, supprimer), onglet admin, route `GET /download/android`,
  page `/download` (+ bouton d'installation PWA), liens des logos, sitemap, signature `release` Gradle, clé générée, doc
  `docs/mobile/android-signing.md`, empreinte de production dans `assetlinks.json`, tests (apk, validation, serveur, route).
- À faire avant mise en service : sauvegarder la clé hors de l'ordinateur ; créer le Blob store privé (Vercel) ; appliquer la
  migration 0071 (après la 0070 de la PR #78) ; tester l'envoi réel d'un APK depuis /admin/mobile-apps (non testé : pas de Blob
  store) ; tester l'installation sur téléphone réel.

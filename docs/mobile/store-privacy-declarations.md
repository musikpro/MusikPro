# Déclarations de confidentialité des boutiques (Google Play et App Store)

Réponses à saisir dans la console Google Play (« Sécurité des données ») et dans App Store Connect
(« Confidentialité de l'app »). Elles reprennent la politique publiée sur `/privacy`, la section « Application mobile »
et le manifeste `ios/App/App/PrivacyInfo.xcprivacy`. **Toute évolution de l'un impose de mettre à jour les trois.**

Dernière relecture : 2026-10-06. À refaire à chaque ajout de service qui reçoit des données (statistiques, publicité,
notifications, nouveau prestataire).

## Faits à connaître

- L'application est un accès au site (Capacitor, mode `server.url`) : le serveur est celui de MusikPro, les données
  sont les mêmes que sur le web.
- **Aucune publicité**, aucun identifiant publicitaire (la permission `AD_ID` n'est pas déclarée), aucun suivi entre
  applications. Les données ne sont **pas vendues**.
- **Voix** : le bouton de dictée utilise la reconnaissance vocale de l'appareil ; MusikPro reçoit uniquement le texte.
  La voix n'est pas enregistrée ni conservée par MusikPro → **audio non déclaré comme collecté**.
- **Photos** : seule la pochette choisie par l'utilisateur est envoyée (hébergée par un service d'images). Pas d'accès
  à la galerie entière (sélecteur du système).
- **Paiement** : Mobile Money via un prestataire (redirection vers sa page). MusikPro ne reçoit aucune donnée de carte.
- **Suppression de compte** : depuis Sécurité (site et application), par e-mail de confirmation ; chansons et données
  personnelles effacées, historique de paiement conservé de façon anonyme.
- Données **chiffrées en transit** (HTTPS uniquement).

## Google Play — Sécurité des données

Collecte de données : **Oui**. Partage avec des tiers : **Non** (les prestataires qui traitent les données pour le compte
de MusikPro — hébergement, IA, paiement, images — ne sont pas du « partage » au sens de Google). Chiffrement en transit :
**Oui**. Possibilité de demander la suppression : **Oui** (dans l'application et sur le site).

| Catégorie Google                 | Type                                       | Collecté | Facultatif             | Finalité                                     |
| -------------------------------- | ------------------------------------------ | -------- | ---------------------- | -------------------------------------------- |
| Informations personnelles        | Nom                                        | Oui      | Non                    | Fonctionnalité de l'appli, gestion du compte |
| Informations personnelles        | Adresse e-mail                             | Oui      | Non                    | Fonctionnalité de l'appli, gestion du compte |
| Informations personnelles        | ID utilisateur                             | Oui      | Non                    | Fonctionnalité de l'appli, gestion du compte |
| Informations personnelles        | Numéro de téléphone                        | Oui      | Oui (achat de crédits) | Fonctionnalité de l'appli                    |
| Informations financières         | Historique des achats                      | Oui      | Oui                    | Fonctionnalité de l'appli                    |
| Photos et vidéos                 | Photos                                     | Oui      | Oui (pochette)         | Fonctionnalité de l'appli                    |
| Contenu de l'utilisateur         | Autre contenu (histoires, paroles, titres) | Oui      | Non                    | Fonctionnalité de l'appli                    |
| Activité dans l'appli            | Interactions avec l'appli                  | Oui      | Non                    | Analyse, fonctionnalité de l'appli           |
| Infos et performances de l'appli | Journaux de plantage / diagnostics         | Oui      | Non                    | Fonctionnalité de l'appli, sécurité          |

Types **non collectés** : position, contacts, calendrier, messages, fichiers audio ou vocaux, informations de santé,
informations de paiement (carte), historique de navigation, identifiants d'appareil publicitaires.

Autorisations Android déclarées : `INTERNET`, `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`, `CAMERA`
(+ `WRITE_EXTERNAL_STORAGE` limité à Android 9 et moins, pour le téléchargement). Pas de permission de lecture des
photos. Formulaire « Autorisations » : microphone = dictée de l'histoire ; appareil photo = photo de pochette.

## Apple — Confidentialité de l'app (étiquettes)

Suivi (« tracking ») : **Non**. Le manifeste `PrivacyInfo.xcprivacy` déclare : `NSPrivacyTracking = false`,
aucun domaine de suivi. Pour chaque type ci-dessous : **lié à l'identité de l'utilisateur : Oui** ; **utilisé pour le suivi :
Non**.

| Type Apple                                  | Finalité                 |
| ------------------------------------------- | ------------------------ |
| Coordonnées → Adresse e-mail                | Fonctionnalités de l'app |
| Coordonnées → Nom                           | Fonctionnalités de l'app |
| Coordonnées → Numéro de téléphone           | Fonctionnalités de l'app |
| Identifiants → ID utilisateur               | Fonctionnalités de l'app |
| Achats → Historique des achats              | Fonctionnalités de l'app |
| Contenu de l'utilisateur → Photos ou vidéos | Fonctionnalités de l'app |
| Contenu de l'utilisateur → Autre contenu    | Fonctionnalités de l'app |
| Utilisation → Interaction avec le produit   | Analyses                 |
| Diagnostics → Autres données de diagnostic  | Fonctionnalités de l'app |

Types **non collectés** : données audio (la voix est convertie en texte par l'appareil), position, santé, contacts,
historique de navigation, données financières (carte), identifiant d'appareil publicitaire.

Questions d'export (App Store Connect) : l'application n'utilise que le chiffrement standard (HTTPS) →
`ITSAppUsesNonExemptEncryption = false` (déjà dans `Info.plist`) ; réponse « exemptée ».

Libellés d'autorisation affichés par iOS (`Info.plist`) : micro, reconnaissance vocale, appareil photo, photothèque —
déjà renseignés en français.

## Pages à renseigner dans les formulaires

- Politique de confidentialité : `https://musikpro.net/privacy`
- Conditions d'utilisation : `https://musikpro.net/terms`
- Suppression de compte (Google exige une URL) : `https://musikpro.net/dashboard/security` (connexion requise) —
  à doubler d'une explication publique dans la politique de confidentialité (déjà présente, section « Vos droits »).
- Contact : adresse indiquée dans la politique.

## Avant chaque nouvelle version

1. Relire cette page, `/privacy` et `PrivacyInfo.xcprivacy`.
2. Comparer avec les autorisations réelles : `android/app/src/main/AndroidManifest.xml` et `ios/App/App/Info.plist`.
3. Si un service est ajouté (notifications, statistiques, publicité), mettre à jour les trois, puis les formulaires.

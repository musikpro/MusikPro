# Signature de l'application Android et publication de l'APK

## La clé de production

- Fichier : `android/keystore/musikpro-release.jks` (RSA 4096 bits, alias `musikpro`, valable jusqu'en 2054).
- Mots de passe : `android/key.properties` (jamais affichés, jamais dans Git : `android/.gitignore` ignore
  `*.jks`, `*.keystore`, `key.properties`, `keystore/`).
- **Sauvegarde obligatoire, hors de cet ordinateur et hors Git** : copier le fichier `.jks` **et** `key.properties` dans un
  gestionnaire de mots de passe ou un coffre chiffré, et en garder une seconde copie. **Si la clé est perdue, plus aucune mise
  à jour n'est possible pour les téléphones qui ont déjà installé l'application** (Android refuse un APK signé par une autre
  clé) ; il faudrait demander de désinstaller puis réinstaller.
- Empreinte publique SHA-256 du certificat (déjà dans `public/.well-known/assetlinks.json`) :
  `62:01:95:9E:8B:BE:A1:4A:8A:E3:84:C3:CD:64:C3:EC:A7:B1:21:BA:5A:9F:E0:70:12:5D:5B:8F:1E:7F:BE:15`
- Empreinte publique SHA-1 (celle que demande Google Cloud pour la connexion Google) :
  `FC:B0:80:96:8D:B8:FC:52:45:D9:F1:72:5C:26:98:D8:A0:9A:0D:A7`

## Connexion Google dans l'application Android

La connexion Google native vérifie que l'application est bien celle qui est déclarée dans Google Cloud. Sinon le plugin
renvoie « Account reauth failed » (erreur 16) et la connexion échoue. À faire une fois par clé de signature :

1. Google Cloud Console → projet MusikPro → **API et services → Identifiants → Créer des identifiants → ID client OAuth**.
2. Type d'application : **Android** ; nom de package : `com.musikpro.app` ; empreinte SHA-1 : celle ci-dessus (la clé de
   publication). Si l'application est aussi lancée depuis Android Studio, créer un second ID client Android avec la
   SHA-1 de la clé de debug (`keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android`).
3. Ne rien changer à l'ID client **Web** : c'est lui qui est utilisé comme `webClientId` et dont l'`idToken` est vérifié par le serveur.
4. **Écran de consentement OAuth** : s'il est en mode « Test », seuls les comptes listés comme utilisateurs de test peuvent se
   connecter (et leur autorisation expire au bout de 7 jours). Pour tous les clients : le passer en **En production**.
5. Attendre quelques minutes (propagation Google), désinstaller puis réinstaller l'application, puis retester.

## Fabriquer et publier une version

1. Numéroter : `npm run mobile:version -- bump --version 1.2` (build +1, identique Android et iPhone).
2. `npm run mobile:sync` puis, depuis `android/` : `./gradlew :app:assembleRelease`
   (JDK d'Android Studio). Le fichier est `android/app/build/outputs/apk/release/app-release.apk`.
3. Vérifier la signature : `apksigner verify --print-certs app-release.apk` doit afficher `CN=MusikPro` et l'empreinte
   ci-dessus.
4. Dans le tableau de bord : **Applications mobiles → Fichiers d'installation** : envoyer l'APK (35 Mo maximum), saisir la
   version et le build **identiques à ceux de l'étape 1**, puis **Publier**. La page `/download#android` (ouverte par le logo Google Play)
   propose alors cette version en option, après l'installation du site comme application (sans avertissement).
5. Tester l'installation sur un téléphone réel (autoriser « Installer des applications inconnues »).

## Limites à connaître

- Hors Play Store, Android peut afficher un avertissement (Play Protect, « développeur inconnu ») : normal ; la page
  `/download` affiche l'empreinte SHA-256 du fichier pour qu'on puisse la vérifier.
- Les mises à jour ne sont pas automatiques : l'utilisateur retélécharge la nouvelle version depuis le site.
- iPhone : pas de téléchargement de fichier possible sans compte Apple Developer ; la page `/download#iphone` explique
  l'installation sur l'écran d'accueil (PWA). Avec un compte payant : TestFlight, dont le lien se met dans « Lien App Store ».

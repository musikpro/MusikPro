# Liens d'application (retour de paiement dans l'app)

Le paiement Chariow s'ouvre dans le navigateur du téléphone. Au retour (`https://musikpro.net/dashboard?payment=success`),
les liens d'application rouvrent l'application au lieu de laisser l'utilisateur dans Chrome / Safari.

## Android (App Links)

- `AndroidManifest.xml` : filtre `autoVerify` sur `https://musikpro.net/dashboard…` (uniquement `/dashboard`, jamais
  les pages d'authentification ou l'API).
- `MainActivity.openAppLink` charge le lien dans la WebView, seulement pour `https`, l'hôte `musikpro.net` et un chemin
  `/dashboard`.
- `public/.well-known/assetlinks.json` : lie le site au paquet `com.musikpro.app` par l'empreinte SHA-256 du certificat
  de signature. **Contient l'empreinte du certificat de production (clé `android/keystore/musikpro-release.jks`) et, pour les tests sur émulateur, celle du certificat de test (debug).**

### À faire avant la publication

Ajouter dans `sha256_cert_fingerprints` l'empreinte du certificat de **production** :

- si la signature par Google Play (Play App Signing) est active : Play Console → Intégrité de l'application → Signature de
  l'application → empreinte SHA-256 du certificat de signature ;
- sinon : `keytool -list -v -keystore <clé>` (alias de la clé de publication).
  Retirer ensuite l'empreinte de test.

### Tester sur l'émulateur

```
adb shell pm verify-app-links --re-verify com.musikpro.app
adb shell pm get-app-links com.musikpro.app        # attendu : musikpro.net: verified
adb shell am start -a android.intent.action.VIEW -d "https://musikpro.net/dashboard?payment=success"
```

## iPhone (Universal Links) — en attente du compte Apple Developer

Il faut l'identifiant d'équipe (Team ID) : fichier `public/.well-known/apple-app-site-association` (`applinks` avec
`<TEAMID>.com.musikpro.app`, chemins `/dashboard*`) et l'entitlement `com.apple.developer.associated-domains`
(`applinks:musikpro.net`) dans l'app.

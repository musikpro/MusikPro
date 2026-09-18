# Mobile App Pipeline — WebView connectée au SaaS en ligne (optionnel)

Le **SaaS Web Next.js déployé est la source principale et obligatoire**. La partie Android/iPhone est un conteneur Capacitor WebView **opt-in** qui ouvre l'URL HTTPS du SaaS déjà en production. Elle ne duplique pas le backend et ne déplace jamais Neon, Resend, les secrets d'authentification ou de paiement dans l'application native.

## Architecture cible

```text
Android / iPhone
      ↓
Capacitor WebView
      ↓
https://monsaas.com
      ↓
Next.js en production
      ↓
API / Auth / Neon / paiements / Resend / services serveur
```

Le mode officiel du kit est `webview-hosted`. Les anciennes configurations `hosted-nextjs` restent acceptées pour compatibilité.

## Ordre obligatoire

1. Terminer le SaaS Web.
2. Valider responsive, Zod, sécurité, auth, API et paiements éventuels.
3. Déployer le SaaS sur son domaine HTTPS final.
4. Vérifier réellement le domaine de production.
5. Décider si Android/iPhone sont nécessaires.
6. Si non, laisser `mobileAppEnabled=false` : le Web reste complet et conforme.
7. Si oui, activer le pipeline WebView puis préparer Android/iOS.

## Commandes

```bash
# Responsive Web — toujours applicable
npm run mobile:check

# Conserver un projet Web-only
npm run mobile:app:configure -- --none

# Activer la WebView connectée au SaaS hébergé
npm run mobile:app:configure -- --app-id=com.entreprise.app --app-name="Mon SaaS" --url=https://monsaas.com --platforms=android,ios

# Installer Capacitor uniquement après opt-in
npm run mobile:app:install

# Générer/synchroniser Android + iOS
npm run mobile:app:prepare

# Audit mobile applicatif
npm run mobile:app:check

# Ouvrir les projets natifs
npx cap open android
npx cap open ios
```

## Outils à prévoir

### Commun
- Node.js/npm déjà utilisés par le SaaS.
- `@capacitor/core` et `@capacitor/cli`.
- `@capacitor/android` et/ou `@capacitor/ios` selon les plateformes choisies.
- Domaine SaaS public en HTTPS.

### Android
- Android Studio.
- Android SDK.
- JDK compatible avec la version Android/Gradle du projet.
- Un émulateur et idéalement un téléphone Android réel.

### iPhone
- macOS.
- Xcode et les composants iOS correspondants.
- Compte/signing Apple au moment des builds et de la distribution.
- Simulateur et idéalement un iPhone réel.

Les exigences exactes des stores et toolchains changent dans le temps : les revalider au moment de la publication.

## Checklist WebView

Avant publication, tester au minimum :
- HTTPS et disponibilité de `productionUrl`;
- login/logout, sessions et cookies dans la WebView;
- OAuth/deep links si utilisés;
- navigation interne et liens externes;
- paiements et redirections de retour si le SaaS en utilise;
- bouton Retour Android;
- Safe Area iPhone;
- clavier et champs de formulaire;
- uploads/caméra/fichiers si utilisés;
- état hors connexion et serveur indisponible;
- aucune clé secrète dans le bundle mobile;
- validation Zod côté serveur pour toute entrée non fiable.

## Images et assets à préparer

Garder au minimum les sources haute définition suivantes :
1. logo principal de l'application;
2. icône carrée de l'application;
3. splash / écran de lancement;
4. captures Android pour la fiche store;
5. captures iPhone pour la fiche store;
6. visuel promotionnel/feature graphic lorsque demandé par le store;
7. éventuels visuels/tablettes si la distribution les cible.

Ne figer aucune dimension de store dans le kit : les dimensions et exigences doivent être vérifiées au moment de la soumission.

## Séparation Web / Mobile

Le code métier serveur reste dans Next.js. `NativeOnly`, `WebOnly`, `NativeBottomNav` et `lib/mobile/native-runtime.ts` isolent les adaptations natives. La navigation native est optionnelle et ne doit jamais se superposer à la navigation Web.

## Règle de non-régression

Si `mobileAppEnabled=false`, aucune dépendance Capacitor n'est requise, aucun projet natif n'est généré et les tests/builds Web restent inchangés. Toute évolution mobile doit être additive et réversible.

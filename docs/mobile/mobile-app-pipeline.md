# Mobile App Pipeline — PWA + Capacitor (Android/iOS)

La source de vérité de cette couche est `.agents/skills/mobile-app-pwa-capacitor/SKILL.md`. L’architecture officielle est **Next.js serveur + PWA + Capacitor → Android + iOS**. Le mode WebView simple est déprécié et ne doit plus être proposé comme pipeline principal.

## Architecture cible

```text
                    Africa SaaS Kit
                    Next.js serveur
                         │
          ┌──────────────┼──────────────┐
          │              │              │
     Web desktop    Web mobile/PWA   App mobile
                                        │
                                    Capacitor
                                   ┌────┴────┐
                                Android    iOS

          même backend / même base / mêmes règles serveur
```

Le navigateur mobile bénéficie du manifest, du service worker et du fallback hors connexion contrôlé. Capacitor ajoute la couche native sans convertir le projet Next.js en export statique.

## Règles non négociables

- ne jamais ajouter `output: 'export'` ;
- le backend Next.js reste la source de vérité pour auth, DB, paiements, webhooks, IA, uploads et logique métier ;
- les secrets restent côté serveur ;
- le service worker ne met jamais en cache aveuglément les réponses privées, admin, paiement, API ou mutations ;
- le desktop conserve son comportement ;
- les adaptations natives sont conditionnelles et isolées ;
- aucun voyant natif n’est vert sans vérification fiable ou test réel.

## Ordre recommandé

1. Terminer et valider le SaaS Web Next.js.
2. Exécuter `npm run mobile:check` et `npm run mobile:pwa:check`.
3. Déployer le SaaS/PWA sur son domaine HTTPS final.
4. Laisser `mobileAppEnabled=false` si aucune app native n’est nécessaire.
5. Pour une ancienne installation `webview-hosted`/`hosted-nextjs`, exécuter `npm run mobile:app:migrate`.
6. Activer `pwa-capacitor`, installer Capacitor puis générer/synchroniser Android/iOS.
7. Tester auth, routes critiques, safe areas, navigation, offline/network et permissions.
8. Construire réellement Android dans Android Studio et iOS dans Xcode avant publication.

## Commandes

```bash
npm run mobile:check
npm run mobile:pwa:check

# Conserver le natif désactivé (PWA Web conservée)
npm run mobile:app:configure -- --none

# Migrer une ancienne configuration WebView simple
npm run mobile:app:migrate

# Activer PWA + Capacitor
npm run mobile:app:configure -- --app-id=com.entreprise.app --app-name="Mon SaaS" --url=https://monsaas.com --platforms=android,ios
npm run mobile:app:install
npm run mobile:app:prepare
npm run mobile:app:check

# Après installation Capacitor
npm run mobile:sync
npm run mobile:android
npm run mobile:ios
```

## PWA et cache

Le kit fournit `app/manifest.ts`, `public/sw.js`, `public/offline.html` et `components/pwa/service-worker-register.tsx`. Le cache est limité aux assets statiques sûrs. Les navigations restent network-first et utilisent seulement la page hors connexion comme fallback. Les routes `/api`, `/admin`, `/dashboard` et les flux d’authentification ne sont pas mis en cache par le service worker.

## Séparation des plateformes

`lib/mobile/native-runtime.ts` centralise les contextes : `web-desktop`, `web-mobile`, `native-android`, `native-ios`. `WebOnly` et `NativeOnly` évitent les doublons d’interface. La navigation du bas Web/PWA est masquée dans Capacitor; la navigation native correspondante est montée séparément.

## Checklist sécurité/auth

Tester signup, login, logout, refresh/session, cookies, CSRF, OAuth, redirections, deep links, vérification email, reset password, admin, paiements, uploads et webhooks serveur. Ne jamais embarquer `DATABASE_URL`, `JWT_SECRET`, `ENCRYPTION_KEY`, `CRON_SECRET` ou des clés provider serveur.

## Android

Préparer package id stable, icônes/splash, permissions minimales, HTTPS, bouton Retour, tests émulateur + appareil réel, APK debug et AAB release signé. Ne jamais committer le keystore ou ses mots de passe.

## iOS

Préparer Bundle Identifier, icônes, launch screen, safe areas, permissions `Info.plist` strictement nécessaires, deep/universal links si utilisés, tests simulateur + iPhone réel, signature Apple et TestFlight. Ne jamais committer les certificats privés.

## Compatibilité legacy

`webview-hosted` et `hosted-nextjs` sont reconnus uniquement comme valeurs historiques à migrer. La migration modifie la stratégie vers `pwa-capacitor`, préserve les dossiers `android/` et `ios/`, puis exige une nouvelle synchronisation et de nouveaux tests.

## Validation

Avant de conclure : install, typecheck, lint, tests, build Next.js, absence d’`output: export`, démarrage serveur, desktop, web mobile/PWA, Android, iOS si environnement disponible, auth/routes critiques, secrets, permissions, safe areas et comportement offline. Les builds natifs non exécutés restent `WARN/NON VÉRIFIÉ`.

---
name: mobile-app-pwa-capacitor
description: Migre et maintient le pipeline mobile Africa SaaS Kit en PWA + Capacitor pour Android et iOS, sans WebView simple, sans export statique Next.js, et sans régression de la version web/desktop.
---

# Africa SaaS Kit — Mobile App Pipeline PWA + Capacitor

## Mission

Cette skill est la source de vérité pour toute création, migration, mise à jour ou réparation de la couche mobile du **Africa SaaS Kit**.

À partir de maintenant, le mode mobile officiel du kit est :

**Next.js serveur + PWA + Capacitor (wrapper mobile) → Android + iOS**

Le mode **WebView simple** n'est plus l'architecture cible du kit et ne doit pas être proposé comme solution principale, ni réintroduit lors d'une refactorisation.

La migration doit rester progressive, réversible au niveau du code source, professionnelle et sans casser les fonctionnalités web existantes.

---

## Règles non négociables

1. **Ne jamais convertir le projet Next.js serveur en export statique.**
   - Ne pas ajouter `output: 'export'`.
   - Ne pas supprimer ou contourner les Route Handlers, Server Actions, authentification serveur, Prisma, cookies, API, webhooks, cron ou autres fonctions nécessitant le runtime serveur.

2. **Le serveur Next.js reste la source de vérité.**
   - Backend, Prisma, base de données, authentification, API, paiements, génération IA et logique métier restent côté serveur.
   - La PWA et Capacitor ajoutent une couche d'expérience mobile ; ils ne remplacent pas le backend.

3. **PWA + Capacitor remplace WebView simple.**
   - Toute ancienne documentation, configuration, UI, script ou instruction qui présente WebView simple comme pipeline mobile par défaut doit être migrée ou marquée obsolète.
   - Ne pas maintenir deux architectures concurrentes dans le kit sauf nécessité explicite de rétrocompatibilité temporaire.

4. **Aucune régression desktop.**
   - Le site ordinateur doit conserver son comportement, son layout et sa navigation existants.
   - Les styles mobiles ne doivent pas polluer les styles globaux desktop.
   - Toute UI réservée à l'app doit être conditionnelle.

5. **Séparer clairement les contextes d'exécution.**
   - `web-desktop`
   - `web-mobile/PWA`
   - `android`
   - `ios`
   - Utiliser une détection fiable de plateforme, notamment `Capacitor.getPlatform()` / `Capacitor.isNativePlatform()` lorsque pertinent.

6. **Refactorisation propre et professionnelle.**
   - Ne pas casser l'existant.
   - Ne pas supprimer une fonctionnalité valide sans justification.
   - Préférer des composants dédiés, des helpers centralisés et une configuration explicite.
   - Éviter les hacks CSS globaux ou les duplications inutiles.

7. **Ne jamais déclarer la migration terminée sans tests.**

---

## Architecture cible obligatoire

```text
                    AFRICA SAAS KIT
                    Next.js serveur
                          │
          ┌───────────────┼────────────────┐
          │               │                │
     Web desktop      Web mobile       App mobile
          │               │                │
          │              PWA           Capacitor
          │                                │
          │                         ┌──────┴──────┐
          │                      Android         iOS
          │
          └──────── même backend / même DB ────────
```

Le navigateur mobile peut bénéficier de la PWA, tandis que Capacitor fournit la couche native Android/iOS.

---

## Déclencheurs

Activer cette skill lorsque l'utilisateur demande notamment :

- `/mobile-app`
- `/mobile-pipeline`
- « créer l'application Android »
- « créer l'application iPhone/iOS »
- « PWA + Capacitor »
- « préparer Play Store / App Store »
- « adapter le SaaS au mobile »
- « ajouter Capacitor »
- « installer la PWA »
- « remplacer WebView »
- « navigation mobile en bas »
- « pipeline mobile »
- « mettre à jour le Mobile App Pipeline »

---

# PHASE 0 — Audit obligatoire avant modification

Avant d'écrire ou modifier du code :

1. Inspecter :
   - `package.json` racine et frontend ;
   - `next.config.*` ;
   - `src/app/layout.*` ;
   - `src/app/globals.css` ;
   - middleware/proxy éventuel ;
   - auth/cookies/CSRF ;
   - Route Handlers et Server Actions ;
   - configuration Vercel ;
   - éventuels fichiers Capacitor déjà présents ;
   - éventuel manifest/service worker/PWA déjà présent ;
   - scripts Android/iOS existants ;
   - documentation du pipeline mobile ;
   - ancienne implémentation WebView.

2. Rechercher explicitement les termes :
   - `WebView`
   - `webview`
   - `Capacitor`
   - `capacitor.config`
   - `PWA`
   - `manifest.webmanifest`
   - `service worker`
   - `android`
   - `ios`
   - `Mobile App Pipeline`

3. Produire un mini-rapport avant modification :
   - ce qui existe ;
   - ce qui doit être conservé ;
   - ce qui doit être migré ;
   - risques de régression ;
   - plan de migration.

4. Ne pas appliquer une recette générique sans tenir compte de l'architecture réelle du repo.

---

# PHASE 1 — Migration de l'ancien mode WebView

## Objectif

Retirer WebView simple comme architecture officielle sans casser les installations existantes.

## Actions

- Identifier les fichiers, docs, scripts et composants qui supposent une WebView simple.
- Remplacer les instructions par **PWA + Capacitor**.
- Si un ancien code WebView est encore utilisé par une installation :
  - ne pas le supprimer brutalement ;
  - isoler la compatibilité ;
  - documenter sa dépréciation ;
  - migrer vers le nouveau pipeline.
- Mettre à jour README, WORKFLOW, STATUS, dashboard propriétaire ou documentation concernée si ces surfaces mentionnent le pipeline mobile.

## Critère de réussite

Aucun parcours principal du kit ne recommande WebView simple pour créer Android/iOS.

---

# PHASE 2 — Couche PWA

## Objectif

Rendre le frontend Next.js installable et adapté aux usages mobiles tout en conservant le serveur Next.js.

## Éléments à prévoir

- `manifest.webmanifest` ou équivalent Next.js ;
- nom court et nom complet ;
- icônes adaptées ;
- `theme_color` ;
- `background_color` ;
- `display: standalone` ;
- orientation si le produit l'exige ;
- start URL compatible avec l'auth et le routing ;
- service worker ;
- stratégie de cache ;
- fallback hors connexion approprié ;
- métadonnées PWA ;
- validation de l'installabilité.

## Cache : règle de sécurité

Ne jamais mettre en cache aveuglément :

- réponses authentifiées privées ;
- endpoints de paiement ;
- endpoints d'administration ;
- réponses contenant des secrets ou données sensibles ;
- mutations POST/PUT/PATCH/DELETE ;
- données dont la fraîcheur est critique.

Préférer :

- cache des assets statiques ;
- fonts ;
- icônes ;
- shell UI ;
- pages publiques sûres ;
- stratégies explicites par type de ressource.

Les opérations serveur comme authentification, paiements, nouvelles données et génération IA continuent à exiger une connexion réseau.

---

# PHASE 3 — Capacitor / wrapper mobile

## Objectif

Créer les projets natifs Android et iOS autour du frontend sans transformer Next.js en site statique.

## Dépendances minimales

Installer selon la version compatible du projet :

```bash
pnpm add @capacitor/core
pnpm add -D @capacitor/cli
pnpm add @capacitor/android @capacitor/ios
```

Adapter les commandes au gestionnaire de paquets réellement utilisé par le repo.

## Initialisation

Créer/configurer :

- `capacitor.config.ts`
- `android/`
- `ios/`

La configuration doit être compatible avec le serveur Next.js existant.

## Interdiction

Ne pas utiliser un `webDir` ou une configuration qui suppose un export statique si cela casse le fonctionnement serveur du SaaS.

## Scripts recommandés

Ajouter des scripts lisibles, par exemple :

```json
{
  "mobile:sync": "cap sync",
  "mobile:android": "cap open android",
  "mobile:ios": "cap open ios"
}
```

Adapter au workspace réel (`frontend/`, pnpm filters, etc.).

---

# PHASE 4 — Détection des plateformes

Créer un helper centralisé, par exemple :

```text
src/lib/platform/
  mobile-platform.ts
```

Le projet doit pouvoir distinguer au minimum :

```text
web
android
ios
```

Quand nécessaire, distinguer aussi :

```text
web-desktop
web-mobile
native-android
native-ios
```

Ne pas disperser des tests de plateforme incohérents dans toute l'application.

---

# PHASE 5 — Navigation mobile inférieure

## Règle

La navigation inférieure doit pouvoir être activée :

- sur le web mobile/PWA si le produit le souhaite ;
- dans Android ;
- dans iOS ;
- jamais sur desktop sauf demande explicite.

Créer de préférence un composant dédié tel que :

```text
components/mobile/MobileBottomNav.tsx
```

ou une structure équivalente cohérente avec le projet.

## Contraintes UX

- 4 à 5 actions principales maximum ;
- zone tactile confortable ;
- respect des safe areas iOS ;
- ne pas masquer le contenu ;
- état actif clair ;
- navigation Next.js fluide ;
- accessibilité clavier/lecteur d'écran quand applicable ;
- pas de duplication incohérente avec le menu desktop.

Prévoir `env(safe-area-inset-bottom)` sur iOS si nécessaire.

---

# PHASE 6 — Fonctions natives

Ajouter uniquement lorsque nécessaires au produit :

- notifications push ;
- caméra ;
- micro ;
- partage ;
- fichiers ;
- géolocalisation ;
- stockage sécurisé ;
- biométrie ;
- status bar ;
- splash screen ;
- deep links / universal links / app links.

Chaque permission native doit être minimale, documentée et demandée uniquement au moment utile.

---

# PHASE 7 — Authentification et sécurité dans l'app

Tester explicitement :

- signup ;
- login ;
- logout ;
- refresh token ;
- cookies ;
- CSRF ;
- OAuth ;
- redirections ;
- deep links ;
- vérification email ;
- reset password ;
- routes admin ;
- paiements ;
- uploads ;
- webhooks côté serveur non impactés.

Ne jamais contourner les protections existantes sous prétexte de compatibilité mobile.

Le wrapper mobile ne doit pas exposer :

- clés API serveur ;
- secrets ;
- credentials de provider ;
- `DATABASE_URL` ;
- `JWT_SECRET` ;
- `ENCRYPTION_KEY` ;
- `CRON_SECRET`.

Les secrets restent côté serveur.

---

# PHASE 8 — Android

Préparer le projet pour Android Studio :

- package/application id stable ;
- nom de l'app ;
- icônes adaptatives ;
- splash screen ;
- permissions minimales ;
- HTTPS uniquement en production ;
- bouton retour Android ;
- tests appareil réel + émulateur ;
- génération APK debug pour test ;
- génération AAB release signé pour Google Play.

Ne jamais committer de keystore privé ou mot de passe de signature.

---

# PHASE 9 — iOS

Préparer le projet pour Xcode :

- Bundle Identifier stable ;
- nom de l'app ;
- icônes ;
- splash/launch screen ;
- safe areas ;
- permissions `Info.plist` uniquement si utilisées ;
- universal links/deep links si nécessaires ;
- tests simulateur + iPhone réel ;
- signature Apple ;
- TestFlight ;
- préparation App Store.

Ne jamais committer de certificats ou secrets de signature privés.

---

# PHASE 10 — Play Store / App Store

Préparer sans automatiser dangereusement :

## Google Play

- AAB release signé ;
- versionCode/versionName ;
- politique de confidentialité ;
- Data Safety ;
- captures ;
- icône ;
- fiche Play Store ;
- tests requis par le type de compte.

## Apple App Store

- archive Xcode ;
- version/build ;
- App Store Connect ;
- privacy declarations ;
- captures ;
- TestFlight ;
- revue App Store.

L'app doit apporter une vraie expérience mobile et ne pas se limiter à une simple coquille WebView.

---

# PHASE 11 — Dashboard propriétaire / État production

Si le kit dispose d'un tableau de bord propriétaire avec voyants, ajouter ou mettre à jour une section **Mobile / PWA + Capacitor**.

Voyants recommandés :

- PWA configurée ;
- manifest valide ;
- service worker actif ;
- cache contrôlé ;
- Capacitor installé ;
- Android généré ;
- iOS généré ;
- navigation mobile présente ;
- safe areas validées ;
- auth mobile testée ;
- build Android validé ;
- build iOS validé ;
- prêt Play Store ;
- prêt App Store.

Le voyant ne doit être vert que si un test réel ou une vérification fiable le confirme.

---

# PHASE 12 — Tests d'intégrité obligatoires

Avant de conclure :

1. Installer les dépendances sans erreur.
2. Exécuter le typecheck.
3. Exécuter ESLint.
4. Exécuter les tests unitaires existants.
5. Exécuter le build Next.js.
6. Vérifier qu'aucun `output: 'export'` n'a été introduit.
7. Vérifier que le serveur Next.js démarre normalement.
8. Tester desktop.
9. Tester web mobile/PWA.
10. Tester Android.
11. Tester iOS si environnement disponible.
12. Tester auth et routes critiques.
13. Vérifier qu'aucun secret n'est embarqué côté client.
14. Vérifier les permissions Android/iOS.
15. Vérifier que les anciennes références WebView par défaut ont été retirées ou dépréciées.
16. Vérifier que la navigation du bas ne s'affiche pas sur desktop.
17. Vérifier les safe areas.
18. Vérifier le comportement hors ligne prévu.
19. Vérifier que les erreurs offline/network ont une UX propre.
20. Générer un rapport final PASS/WARN/FAIL.

---

# Commandes de validation à adapter au repo

Ne jamais supposer les scripts. Lire `package.json` puis utiliser ceux qui existent.

Exemples possibles :

```bash
pnpm install
pnpm lint
pnpm test
pnpm build
pnpm mobile:sync
```

Si le workspace utilise `frontend/`, respecter les filtres pnpm ou les scripts orchestrateurs du repo.

---

# Critères d'acceptation

La migration est validée uniquement si :

- le SaaS Next.js serveur fonctionne toujours ;
- aucune fonctionnalité backend existante n'est cassée ;
- la version desktop est inchangée fonctionnellement ;
- la version web mobile est responsive ;
- la PWA est installable ou correctement préparée ;
- Capacitor est correctement configuré ;
- Android est générable ;
- iOS est générable sur macOS/Xcode ;
- les fonctions natives sont isolées ;
- la navigation inférieure respecte les contextes ciblés ;
- aucune clé privée n'est exposée ;
- les tests d'intégrité passent ;
- WebView simple n'est plus l'architecture officielle du kit.

---

# Sortie attendue de l'agent

À la fin d'une exécution de cette skill, fournir :

1. **Résumé de l'audit initial**.
2. **Liste exacte des fichiers ajoutés/modifiés/supprimés**.
3. **Migration WebView → PWA + Capacitor effectuée**.
4. **Configuration PWA réalisée**.
5. **Configuration Capacitor réalisée**.
6. **État Android**.
7. **État iOS**.
8. **État navigation mobile**.
9. **État sécurité/auth**.
10. **Résultats des tests** avec PASS/WARN/FAIL.
11. **Actions manuelles restantes**, uniquement si elles nécessitent Android Studio, Xcode, comptes développeur, signatures ou stores.

Ne jamais prétendre qu'un build natif ou une publication store a été validé si l'environnement correspondant n'a pas réellement été exécuté.

---

# Instruction permanente au kit

À compter de cette migration :

> Toute fonctionnalité « Mobile App Pipeline » du Africa SaaS Kit doit utiliser **PWA + Capacitor** comme architecture mobile par défaut pour Android et iOS. Le mode **WebView simple est déprécié**. Le projet conserve **Next.js serveur** comme backend/source de vérité et ne doit pas être converti en export statique. Toute modification doit être réalisée comme une refactorisation propre et professionnelle, avec isolation Web/Desktop/Mobile et tests anti-régression obligatoires.

## Langue de réponse

Toujours répondre à l’utilisateur en **français** par défaut. Conserver les commandes, chemins, identifiants et extraits de code dans leur syntaxe technique d’origine, sauf demande explicite d’une autre langue.

## Règle de refactorisation non régressive

Toute application de cette skill doit être traitée comme une **refactorisation propre et professionnelle**, en préservant les fonctionnalités existantes, en isolant Web/Desktop/Mobile et en exécutant les tests anti-régression pertinents avant de conclure.

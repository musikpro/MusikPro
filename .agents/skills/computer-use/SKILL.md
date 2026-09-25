---
name: computer-use
description: Vérifie et utilise le Browser Subagent / Browser Tools d’Antigravity pour assister visuellement le développement, tester les interfaces et valider les étapes du Africa SaaS Kit sans prétendre qu’un simple fichier prouve l’activation.
---

## Langue de réponse

Toujours répondre à l’utilisateur en **français**. Conserver seulement les commandes, chemins, identifiants et extraits de code dans leur syntaxe technique d’origine. Utiliser une autre langue uniquement si l’utilisateur le demande explicitement pour une réponse précise.

# /computer-use — Assistance navigateur continue

Cette skill est l’interface officielle du kit pour le **Computer Use / Browser Tools** dans Antigravity.

## Règle de refactorisation

Toute intervention doit être traitée comme une **refactorisation propre, professionnelle et non régressive**. Préserver les fonctionnalités existantes, éviter les suppressions/destructions inutiles, privilégier les changements additifs et réversibles, puis exécuter les contrôles pertinents du kit avant de conclure. Une rupture nécessaire doit être accompagnée d’une migration explicite et documentée.

## Principe

Antigravity fournit nativement un Browser Subagent capable d’ouvrir, lire et manipuler Chrome. Il n’y a donc **aucun package npm `computer-use` à installer** dans le projet. Le setup doit vérifier que les Browser Tools sont activés et qu’un vrai test navigateur fonctionne.

## Vérification initiale obligatoire dans Antigravity

1. Exécuter `npm run computer-use:check`.
2. Si le statut est `UNVERIFIED`, guider l’utilisateur vers **Settings → Browser → Browser Tools** et demander de vérifier que les outils navigateur ne sont pas désactivés.
3. Recommander **Request Review** pour les actions navigateur sensibles plutôt que l’exécution sans contrôle.
4. Utiliser réellement le Browser Subagent pour ouvrir `https://www.antigravity.google/docs/browser` et lire le titre/contenu de la page.
5. Seulement après cette preuve, exécuter :
   `npm run computer-use:mark -- --status=verified --evidence="Browser Subagent: documentation Antigravity ouverte et lue"`
6. Relancer `npm run computer-use:check` puis `/setup-saas`.
7. Après `npm install`, utiliser ensuite Computer Use sur `http://localhost:3000` et `/api/health` pendant les phases suivantes.

## Utilisation pendant tout le projet

Le Browser Subagent doit être utilisé dès qu’une phase possède une surface visuelle ou web vérifiable :

- dashboard local du kit ;
- pages issues de Banani ;
- responsive 320/360/390/430/768/1024/1440 ;
- skeleton/loading/empty/error/success ;
- formulaires d’authentification ;
- Google OAuth ;
- uploads Cloudinary ;
- checkout et retours de paiement sandbox ;
- endpoints health/readiness ;
- previews Vercel ;
- domaine final, HTTPS, robots, sitemap, Open Graph et Search Console.

Après chaque étape visuelle importante, produire une courte preuve : page testée, viewport, résultat attendu/observé et anomalie éventuelle. Ne jamais marquer une étape PASS sans l’avoir réellement observée.

## Limites et sécurité

- Le Browser Subagent ne remplace pas les tests unitaires, typecheck, build, audit de sécurité ou vérification cryptographique des webhooks.
- Ne jamais contourner les confirmations de sécurité d’Antigravity.
- Pour les connexions à Neon, Google, Vercel, Cloudflare, Cloudinary ou providers de paiement, l’agent peut naviguer et guider, mais l’utilisateur doit garder le contrôle des identifiants, MFA, achats, changements DNS critiques et passage sandbox → live.
- Ne jamais copier de secret dans le chat, un rapport, une capture ou un fichier suivi par Git.
- Utiliser l’Allowlist Antigravity seulement pour les domaines nécessaires au projet.
- En cas d’indisponibilité du Browser Subagent, marquer la vérification `NON VÉRIFIÉE` et fournir les étapes d’activation au lieu de prétendre que Computer Use fonctionne.

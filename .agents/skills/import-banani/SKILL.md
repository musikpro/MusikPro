---
name: import-banani
description: Importe le projet/design Banani via MCP, inventorie tous les écrans observés, compare avec Africa SaaS Kit et génère un gap analysis + plan d’implémentation sans doublons.
---

## Langue de réponse
Toujours répondre à l’utilisateur en **français**. Conserver seulement les commandes, chemins, identifiants et extraits de code dans leur syntaxe technique d’origine. Utiliser une autre langue uniquement si l’utilisateur le demande explicitement pour une réponse précise.

# /import-banani — Import design Banani → comparaison starter → plan d’implémentation

Cette skill s’utilise **après** `npm run banani:check` et seulement si Banani MCP est réellement connecté via `.codex/config.toml`.


## Règle de refactorisation
Toute intervention doit être traitée comme une **refactorisation propre, professionnelle et non régressive**. Préserver les fonctionnalités existantes, éviter les suppressions/destructions inutiles, privilégier les changements additifs et réversibles, puis exécuter les contrôles pertinents du kit avant de conclure. Une rupture nécessaire doit être accompagnée d’une migration explicite et documentée.

## Objectif
Ne jamais passer directement du design Banani au code. La skill doit d’abord voir le design disponible dans Banani, l’inventorier, le comparer avec ce qui existe déjà dans Africa SaaS Kit, puis générer un plan d’implémentation complet.

## Étapes obligatoires
1. Lire `AGENTS.md`, `DESIGN.md`, `config/features.json`, `design/banani/import-schema.json` et `docs/design/import-banani.md`.
2. Exécuter `npm run banani:check`.
3. Inspecter les outils MCP Banani réellement disponibles dans la session. Ne jamais inventer un nom d’outil MCP.
4. Utiliser les outils Banani disponibles pour récupérer la vue la plus complète possible du projet : pages/screens, noms, états/variantes, structure visuelle, interactions visibles et flows lorsque le MCP les expose.
5. Si le MCP ne permet pas de récupérer un élément, le marquer `NON VÉRIFIÉ` au lieu de l’inventer.
6. Écrire l’inventaire réel dans `design/banani/imported-design.json` conformément à `design/banani/import-schema.json`. Aucun token ni secret ne doit être écrit dans ce fichier.
7. Exécuter `npm run import-banani:analyze`.
8. Lire `generated/banani-gap-analysis.md` puis `generated/implementation-plan.md`.
9. Présenter les résultats en quatre catégories : **RÉUTILISER**, **ADAPTER**, **CRÉER**, **À CONFIRMER**.
10. Ne commencer le code qu’après présentation du plan à l’utilisateur.

## Règles anti-doublons
- Avant de proposer une nouvelle route, vérifier `app/**/page.tsx`, `app/api/**/route.ts` et `config/features.json`.
- Avant de créer un composant, inspecter `components/` et proposer la réutilisation/adaptation des primitives existantes.
- Ne jamais créer une deuxième auth, un deuxième moteur de paiement, un deuxième upload handler ou un second helper SEO si une feature existante couvre déjà le rôle.
- Un design n’est pas une règle métier : prix, permissions, workflow de paiement, logique de rôle, notifications et contraintes DB absentes du design restent `À CONFIRMER`.

## Sorties attendues
- `design/banani/imported-design.json` — snapshot sans secret du design réellement observé.
- `design/banani/screens.json` — inventaire normalisé utilisé par le planner.
- `generated/banani-gap-analysis.md`
- `generated/banani-gap-analysis.json`
- `generated/implementation-plan.md`

## Gate
La skill est terminée seulement si :
- Banani MCP est configuré ;
- au moins un écran réel a été importé ;
- le gap analysis existe ;
- le plan existe ;
- les éléments non observables sont marqués `NON VÉRIFIÉ` / `À CONFIRMER` ;
- aucun secret Banani n’apparaît dans les fichiers générés.

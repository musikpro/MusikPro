# Africa SaaS Kit — instructions Claude Code

Claude Code est un agent officiellement supporté par ce kit, au même titre que Codex/Antigravity.

## Langue obligatoire
- Toujours répondre à l’utilisateur en **français**.
- Toutes les explications, analyses, comptes rendus, questions et recommandations doivent être en français.
- Garder les commandes, chemins, identifiants, noms d’API et extraits de code dans leur syntaxe d’origine lorsque nécessaire.
- Ne répondre dans une autre langue que si l’utilisateur le demande explicitement pour une réponse précise.


## Règle obligatoire — refactorisation propre et non régressive
- **Toute modification, correction, mise à jour, migration, intégration ou nouvelle fonctionnalité doit être traitée comme une refactorisation propre, professionnelle et non régressive.**
- Inspecter d’abord l’architecture, les dépendances et les fonctionnalités déjà présentes avant de modifier le code.
- Préserver les comportements existants, routes, contrats API, modèles de données, variables d’environnement, règles de sécurité, skills et workflows, sauf demande explicite nécessitant leur évolution.
- Préférer des changements additifs, isolés, réversibles et rétrocompatibles plutôt qu’une réécriture destructive.
- Ne jamais supprimer ou casser une fonctionnalité existante pour en ajouter une nouvelle ; si une évolution incompatible est réellement nécessaire, prévoir une migration claire et documentée.
- Après chaque refactorisation, exécuter les contrôles pertinents du kit (`npm run kit:integrity`, `npm run kit:audit`, `/security-saas`, gates Zod et tests de la fonctionnalité concernée) et corriger toute régression avant de considérer le travail terminé.

## Sources de vérité
- Lire `AGENTS.md`, `README.md`, `SECURITY.md`, `DESIGN.md` avant une refactorisation importante.
- Réutiliser les workflows de `.agents/skills/` au lieu de créer une deuxième logique divergente.
- Les commandes Claude Code dans `.claude/commands/` pointent vers les mêmes scripts npm que le reste du kit.

## Règles de travail
- Inspecter les fichiers avant de les modifier; ne pas supposer leur contenu.
- Préserver les fonctionnalités existantes et préférer les changements additifs/réversibles.
- Ne jamais révéler ou déplacer des secrets dans le code client, les logs, les captures ou Git.
- Toute entrée non fiable doit être validée côté serveur avec Zod.
- Avant production: `npm run kit:verify`, `npm run security-saas`, staging Vercel approuvé, puis `npm run deploy:production:check`.
- Pour le CRUD Clients, respecter l’ordre Banani → plan → Prisma Client → `/api/clients/*`.
- La partie Android/iOS reste optionnelle et utilise Capacitor WebView vers le SaaS HTTPS en ligne.

## Computer Use / Browser
- Vérifier séparément OpenAI et Claude Code sur la page État de préparation.
- Pour Claude Code, exécuter `npm run computer-use:claude:check`. Après un vrai test navigateur/computer réussi, enregistrer la preuve avec `npm run computer-use:claude:mark -- --status=verified --evidence="..."`.
- Ne jamais afficher le voyant vert sur simple présence d’un fichier de configuration: un test réel doit avoir été marqué `verified`.
- Computer Use complète les tests de code; il ne remplace pas lint, typecheck, tests, build, sécurité, Zod ou staging.

## Commandes essentielles
- `/setup-saas` : parcours guidé 21 phases.
- `/security-saas` : audit de sécurité.
- `/import-banani` : import et analyse des écrans Banani.
- `/computer-use` : vérification Computer Use OpenAI/Antigravity.
- `/computer-use-claude` : vérification Computer Use / Browser pour Claude Code.

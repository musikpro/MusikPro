---
name: computer-use-claude
description: Vérifie Computer Use / Browser pour Claude Code et enregistre un voyant vert uniquement après un test réel.
---

## Langue de réponse
Toujours répondre à l’utilisateur en **français**. Conserver seulement les commandes, chemins, identifiants et extraits de code dans leur syntaxe technique d’origine. Utiliser une autre langue uniquement si l’utilisateur le demande explicitement pour une réponse précise.
# /computer-use-claude

1. Exécuter `npm run claude-code:check` puis `npm run computer-use:claude:check`.
2. Ouvrir une page réelle avec l’outil navigateur/computer disponible dans Claude Code ou un MCP navigateur autorisé.
3. Vérifier visuellement un élément observable (titre, texte ou état UI).
4. Après succès seulement : `npm run computer-use:claude:mark -- --status=verified --evidence="preuve courte"`.
5. Ne jamais recopier l’état OpenAI dans l’état Claude; les deux voyants sont indépendants.
6. Un test navigateur ne remplace jamais lint, typecheck, tests, build, Zod, sécurité ou staging.


## Règle de refactorisation
Toute intervention doit être traitée comme une **refactorisation propre, professionnelle et non régressive**. Préserver les fonctionnalités existantes, éviter les suppressions/destructions inutiles, privilégier les changements additifs et réversibles, puis exécuter les contrôles pertinents du kit avant de conclure. Une rupture nécessaire doit être accompagnée d’une migration explicite et documentée.
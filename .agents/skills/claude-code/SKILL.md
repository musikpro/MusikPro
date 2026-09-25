---
name: claude-code
description: Prépare et vérifie Africa SaaS Kit pour Claude Code d’Anthropic sans dupliquer les workflows OpenAI/Codex existants.
---

## Langue de réponse

Toujours répondre à l’utilisateur en **français**. Conserver seulement les commandes, chemins, identifiants et extraits de code dans leur syntaxe technique d’origine. Utiliser une autre langue uniquement si l’utilisateur le demande explicitement pour une réponse précise.

# /claude-code — compatibilité Claude Code

1. Lire `CLAUDE.md`, `AGENTS.md`, `SECURITY.md` et `DESIGN.md`.
2. Exécuter `npm run claude-code:prepare`, puis `npm run claude-code:check`.
3. Réutiliser les workflows de `.agents/skills/` et les scripts npm existants; ne pas forker la logique métier.
4. Utiliser `.claude/commands/` comme raccourcis vers `/setup-saas`, `/security-saas`, `/import-banani` et `/computer-use-claude`.
5. Ne jamais stocker de clé Anthropic, token MCP ou secret dans `CLAUDE.md`, `.claude/settings.json` ou Git.
6. Avant une livraison importante, exécuter `npm run kit:verify` et respecter le staging obligatoire.

## Règle de refactorisation

Toute intervention doit être traitée comme une **refactorisation propre, professionnelle et non régressive**. Préserver les fonctionnalités existantes, éviter les suppressions/destructions inutiles, privilégier les changements additifs et réversibles, puis exécuter les contrôles pertinents du kit avant de conclure. Une rupture nécessaire doit être accompagnée d’une migration explicite et documentée.

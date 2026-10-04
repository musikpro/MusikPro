# Claude Code — Africa SaaS Kit

Claude Code (Anthropic) est l’unique agent de développement officiellement supporté par cette distribution du kit.

## Source de vérité

- `CLAUDE.md` contient les règles générales et interdictions permanentes.
- `.claude/commands/` contient les commandes projet.
- `.claude/skills/` contient les workflows officiels.
- `npm run claude-code:prepare` vérifie les fichiers nécessaires.
- `npm run claude-code:check` vérifie la cohérence de l’intégration et la présence éventuelle du CLI Claude.

## Computer Use

Utiliser `npm run computer-use:claude:check` puis enregistrer une preuve réelle avec `npm run computer-use:claude:mark -- --status=verified --evidence="..."`.

## Banani

Banani MCP / Implementation Planner est connecté uniquement via Claude Code en scope local. Utiliser `npm run banani:prepare`, puis `npm run banani:check`.

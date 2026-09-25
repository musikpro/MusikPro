# Claude Code dans Africa SaaS Kit

Africa SaaS Kit supporte Claude Code comme agent de développement en plus de l’environnement OpenAI/Codex/Antigravity.

## Installation / détection

Exécutez `npm run claude-code:check`. Le contrôle valide les fichiers d’intégration du projet et tente de détecter la commande `claude` dans le shell courant. L’absence du CLI sur une machine de CI ne casse pas la compatibilité du starter tant que les fichiers projet sont valides.

## Instructions projet

Claude Code doit lire `CLAUDE.md`, puis `AGENTS.md`, `SECURITY.md`, `DESIGN.md` et les skills existants dans `.agents/skills/`. Les commandes `.claude/commands/` ne dupliquent pas la logique : elles renvoient vers les mêmes scripts npm.

## Computer Use / Browser

Le voyant Claude Code est séparé du voyant OpenAI. Pour le rendre vert :

1. lancer `npm run computer-use:claude:check`;
2. effectuer un vrai test navigateur/computer avec Claude Code (outil intégré disponible dans votre environnement/modèle, ou MCP navigateur autorisé);
3. après succès uniquement, enregistrer `npm run computer-use:claude:mark -- --status=verified --evidence="description du test"`.

Le statut est local dans `.africa-saas/computer-use-claude.json` et n’est pas commité. Un test OpenAI ne valide jamais automatiquement Claude, et inversement.

## Sécurité

Ne stockez jamais de token Anthropic, clé API ou secret MCP dans `CLAUDE.md`, `.claude/settings.json`, Git ou une capture. Utilisez les mécanismes locaux/variables d’environnement fournis par Claude Code.

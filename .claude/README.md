# Règle de langue

**Toujours répondre en français** dans Claude Code pour ce projet. Les commandes, chemins, identifiants et extraits de code gardent leur syntaxe technique d’origine.
## Règle de refactorisation
Toute modification du projet doit être une **refactorisation propre, professionnelle et non régressive** : préserver les fonctionnalités existantes, privilégier les changements additifs/réversibles, puis relancer les contrôles d’intégrité, sécurité et Zod adaptés avant de terminer.


# Claude Code — Africa SaaS Kit

Ce dossier contient la couche de compatibilité Claude Code du kit. Aucun secret ne doit y être stocké.

- `../CLAUDE.md` : instructions projet.
- `commands/` : commandes locales qui réutilisent les workflows officiels du kit.
- `settings.json` : réglages partagés non sensibles.

Les réglages locaux ou tokens éventuels doivent rester hors Git. Utilisez `npm run claude-code:check` pour contrôler l’intégration.

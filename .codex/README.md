# Règle de langue

**Toujours répondre en français** dans Codex/Antigravity pour ce projet. Les commandes, chemins, identifiants et extraits de code gardent leur syntaxe technique d’origine.
## Règle de refactorisation
Toute modification du projet doit être une **refactorisation propre, professionnelle et non régressive** : préserver les fonctionnalités existantes, privilégier les changements additifs/réversibles, puis relancer les contrôles d’intégrité, sécurité et Zod adaptés avant de terminer.


# Codex MCP local configuration

`config.toml` is intentionally shipped **empty**.

Use `npm run banani:prepare` to create it if it is missing. Then open `.codex/config.toml` and paste the Banani MCP configuration obtained from your own Banani account.

Security rules:

- `.codex/config.toml` is ignored by Git because it may contain bearer tokens.
- Never commit or paste Banani tokens into README files, source code, screenshots, issues, chats, or pull requests.
- If a token is exposed, revoke/rotate it immediately in Banani and replace it locally.
- `npm run banani:check` validates the shape without printing the token.

# Banani — connexion MCP via Claude Code uniquement

## Règle officielle

Africa SaaS Kit connecte **Banani MCP / Implementation Planner uniquement à Claude Code (Anthropic)**.

La connexion officielle utilise le **scope local Claude Code**, stocké par Claude Code dans `~/.claude.json` pour le projet courant. Aucun token Banani n'est écrit dans le dépôt.

## Préparation

```bash
npm run banani:prepare
```

Cette commande :
- vérifie que Claude Code est disponible ;
- n'écrit jamais de token ;
- affiche la commande Claude Code à exécuter manuellement.

## Connexion Claude Code

Depuis un terminal ouvert à la racine du projet, exécute manuellement :

```bash
claude mcp add --transport http banani --scope local https://app.banani.co/api/mcp/mcp --header "Authorization: Bearer <TON_TOKEN_BANANI>"
```

Remplace le placeholder uniquement dans ton terminal local. Ne colle jamais le token dans le chat, Git, `.mcp.json`, une capture ou un rapport.

Ensuite, dans Claude Code, ouvre `/mcp` et confirme que `banani` est connecté.

## Vérification

```bash
npm run banani:check
```

Le contrôle vérifie sans afficher le token :
- qu'aucune entrée Banani project-scope n'est committée dans `.mcp.json` ;
- qu'un serveur `banani` existe dans le scope local Claude Code du projet ;
- que l'URL est HTTPS et utilise `app.banani.co` ;
- qu'une authentification Bearer ou un `headersHelper` est présent.

## Import et Implementation Planner

Après connexion réussie :
1. lance `/import-banani` **dans Claude Code** ;
2. laisse Claude Code observer les écrans via Banani MCP ;
3. génère `design/banani/imported-design.json` sans secret ;
4. exécute `npm run import-banani:check` puis `npm run import-banani:analyze` ;
5. lis le gap analysis et `generated/implementation-plan.md` avant de coder.

Les artefacts générés sont ensuite utilisés directement dans la même session/progression Claude Code.

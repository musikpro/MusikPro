# Banani — connexion MCP locale via `.codex/config.toml`

## Méthode officielle du kit

Africa SaaS Kit utilise désormais **`.codex/config.toml`** comme point de connexion local Banani pour Codex/Antigravity, car cette méthode s'est révélée la plus directe et la plus fiable dans le workflow utilisateur.

Le fichier est livré **vide** et le kit ne doit jamais y écrire automatiquement une URL, un token ou un exemple de secret.

Préparer le fichier :

```bash
npm run banani:prepare
```

Cette commande :

- crée `.codex/config.toml` uniquement s'il n'existe pas ;
- crée un fichier vide ;
- ne remplace jamais un fichier déjà configuré ;
- essaie d'appliquer des permissions locales restrictives ;
- n'écrit aucun token.

Ensuite, ouvre `.codex/config.toml` et colle **manuellement** la configuration MCP fournie par ton propre compte Banani. La forme attendue est de ce type, avec ton token local à la place du placeholder :

```toml
[mcp_servers.banani]
url = "https://app.banani.co/api/mcp/mcp"
http_headers = { "Authorization" = "Bearer <TON_TOKEN_BANANI>" }
```

> Ne copie jamais une vraie valeur de token dans une documentation, un chat, une capture publique ou Git.

Vérifier sans afficher le token :

```bash
npm run banani:check
```

Le contrôle vérifie :

- présence de `.codex/config.toml` ;
- présence de la section Banani MCP ;
- présence de l'URL et d'un bearer token, sans imprimer sa valeur ;
- couverture par `.gitignore` ;
- absence du fichier dans les fichiers suivis par Git.

## Sécurité Git

`.codex/config.toml` est explicitement ignoré par Git. Il peut contenir un bearer token et doit rester **strictement local**.

Si un token apparaît dans :

- une capture d'écran ;
- une issue ;
- un commit ;
- un chat ;
- un fichier partagé ;

considère-le comme compromis et **révoque/régénère-le immédiatement** dans Banani.

## Import des écrans

Une fois MCP connecté :

1. demande à Codex/Antigravity d'accéder aux écrans Banani ;
2. inventorie les écrans réellement importés dans `design/banani/screens.json` ;
3. conserve les décisions visuelles dans `DESIGN.md` ;
4. lance `npm run design:check` ;
5. lance `npm run design:plan` avant le développement massif.

Banani ne décide jamais automatiquement :

- des permissions ;
- de l'authentification ;
- des règles métier ;
- des paiements ;
- des secrets ;
- de la validation serveur.

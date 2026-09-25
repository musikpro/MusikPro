# Import Banani → Africa SaaS Kit

Cette étape intervient après la connexion MCP Banani. Le but n’est pas de copier du HTML/CSS brut : le kit doit d’abord **comprendre le design**, le comparer à son architecture existante et décider quoi réutiliser, adapter ou créer.

## Commande Agent

Dans Antigravity/Codex :

```text
/import-banani
```

La skill doit utiliser les outils MCP Banani disponibles dans la session. Les noms exacts des outils MCP peuvent évoluer : l’agent doit les découvrir au runtime et ne jamais les inventer.

## Pipeline

```text
Banani MCP
  ↓
inventaire réel des écrans
  ↓
design/banani/imported-design.json
  ↓
npm run import-banani:analyze
  ↓
comparaison routes/components/features existants
  ↓
banani-gap-analysis
  ↓
implementation-plan
  ↓
validation utilisateur
  ↓
code phase par phase
```

## Catégories de comparaison

- **RÉUTILISER** : l’écran ou la fonction existe déjà et peut rester tel quel.
- **ADAPTER** : la route/fonction existe mais le rendu ou la composition doit suivre Banani.
- **CRÉER** : aucune route/page équivalente n’existe.
- **À CONFIRMER** : le design ne suffit pas pour déduire la règle métier ou technique.

## Sécurité

- `.codex/config.toml` reste local et ignoré par Git.
- Aucun token Banani ne doit être copié dans `imported-design.json`, les rapports ou le chat.
- Les écrans Banani ne décident jamais des permissions serveur, du schéma DB ou de la sécurité.
- Le rapport doit consulter `config/features.json` avant de proposer une nouvelle feature transversale.

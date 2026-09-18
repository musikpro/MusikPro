# Hydration guard

En développement, des extensions navigateur ou outils locaux peuvent modifier le DOM avant que React ne l'hydrate. Un exemple fréquent est l'ajout d'un attribut du type `__processed_<uuid>__="true"` sur `<body>`.

Africa SaaS Kit tolère uniquement ces différences d'attributs sur `<body>` via `suppressHydrationWarning`. La tolérance n'est pas appliquée à `<html>` ni aux composants de l'application, afin que les vraies erreurs d'hydratation restent visibles.

Si un avertissement d'hydratation apparaît ailleurs, il faut le corriger plutôt que l'ignorer : valeurs non déterministes (`Date.now()`, `Math.random()`), locale différente serveur/client, branche `window`, DOM invalide, etc.

Contrôle :

```bash
npm run ui:hydration-check
```

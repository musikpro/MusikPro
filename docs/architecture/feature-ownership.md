# Feature ownership et suppression sûre

`config/features.json` est la carte de propriété du kit. Elle sert à éviter deux erreurs des agents IA : **dupliquer une responsabilité existante** et **supprimer une feature optionnelle en cassant ses dépendances**.

Avant d’ajouter une feature : `npm run features:list`, puis vérifier si une feature existante possède déjà la route, la librairie ou la responsabilité.

Avant de retirer une feature : lire `dependsOn`, `disableBehavior`, `removalComplexity`, `files` et `routes`. Dans un starter réutilisable, désactiver via configuration est souvent préférable à supprimer physiquement le code.

Après changement :

```bash
npm run features:check
npm run runtime:check
npm run security:check
```

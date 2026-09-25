# État production — dashboard propriétaire

Le menu **État production** est une brique permanente d'Africa SaaS Kit. Il doit être présent dans tout tableau de bord propriétaire/administrateur généré à partir du kit, même si le projet ne le demande pas explicitement.

## Contrat UI

- Libellé : **État production**
- Route rétrocompatible : `/admin/production-doctor`
- Description : **Diagnostic local de préparation à la production. Le rapport CLI reste la source de vérité.**
- Vert : installé/prêt
- Orange : à compléter ou à vérifier
- Rouge : absent ou bloquant

Le tableau de bord ne remplace jamais le CLI. Il affiche le dernier rapport généré par `npm run doctor:production` ou `npm run doctor:production:online`.

## Contrôle de régression

`npm run kit:integrity` échoue si le menu ou la page disparaît. Le Production Doctor contient également le contrôle `owner-production-state`, afin que l'absence du menu apparaisse comme un blocage de préparation.

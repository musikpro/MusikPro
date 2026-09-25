# Migrations Drizzle versionnées

Ce dossier reçoit les migrations générées par `npm run db:generate`.

Règles :

1. Générer la migration après toute modification de schéma.
2. Relire le SQL généré.
3. Tester sur Neon staging.
4. Committer les fichiers de migration dans Git.
5. Exécuter `npm run db:migrate` en staging puis en production.

Ne jamais remplacer ce mécanisme par `db push` en production.

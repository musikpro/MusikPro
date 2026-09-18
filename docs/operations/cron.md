# Cron Vercel — paiements optionnels

Le kit n'impose aucun cron tant que les paiements sont désactivés.

Après activation d'au moins un provider en Phase 16 :

```bash
npm run cron:generate
```

Le script fusionne dans `vercel.json` une entrée pour `/api/cron/reconcile-payments`. La fréquence par défaut est horaire et peut être adaptée avec `PAYMENT_RECONCILE_CRON` au moment de la génération selon ton plan Vercel et le besoin métier.

La route accepte GET (Vercel Cron) et POST (test manuel) et vérifie `Authorization: Bearer ${CRON_SECRET}` en production.

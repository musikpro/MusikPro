# Cron Vercel — paiements optionnels

Le kit n'impose aucun cron tant que les paiements sont désactivés.

Après activation d'au moins un provider en Phase 16 :

```bash
npm run cron:generate
```

Le script fusionne dans `vercel.json` une entrée pour `/api/cron/reconcile-payments`. La fréquence par défaut est quotidienne (`0 4 * * *`), compatible avec le plan Vercel Hobby qui limite les crons à une exécution par jour ; elle peut être resserrée avec `PAYMENT_RECONCILE_CRON` au moment de la génération si le projet est passé au plan Pro.

La route accepte GET (Vercel Cron) et POST (test manuel) et vérifie `Authorization: Bearer ${CRON_SECRET}` en production.

## Rattrapage des générations musicales

`/api/cron/reconcile-music-jobs` (toujours enregistré par `npm run cron:generate`, `0 5 * * *` par défaut, variable `MUSIC_JOBS_RECONCILE_CRON`) rejoue le même chemin que la page « Mes chansons » (`pollJobForProvider`) pour les jobs encore « processing » des dernières 24 h : finalisation MP3, passage en échec après `maxPollingMinutes`, remboursement automatique des crédits. Il sert de filet quand l'onglet du client est fermé.

Sur le plan Hobby, Vercel limite les crons à une exécution par jour. Pour un rattrapage toutes les 5 minutes sans passer au plan Pro, appeler la route depuis un planificateur externe (GitHub Actions `schedule`, cron-job.org) : `curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://<domaine>/api/cron/reconcile-music-jobs`.

Le workflow GitHub `.github/workflows/reconcile-music-jobs.yml` fait cet appel toutes les 5 minutes (secret `CRON_SECRET` à créer dans GitHub, variable optionnelle `APP_URL`). GitHub peut retarder une exécution planifiée de quelques minutes en période de charge.

## Planificateur EasyCron (remplace GitHub Actions)

Un plan EasyCron appelle `POST /api/cron/reconcile-music-jobs` toutes les 5 minutes (`*/5 * * * *`) avec l'en-tête `Authorization: Bearer <CRON_SECRET>`. La boîte « Planificateur » de `/admin/settings` en lit l'historique via l'API EasyCron v1 (`GET /v1/cron-jobs/{id}/logs`, en-tête `X-API-Key`) : dernier passage, 100 derniers passages, durée moyenne. Variables Vercel (Production) : `EASYCRON_API_KEY` (secret, https://www.easycron.com/user/key) et `EASYCRON_CRON_JOB_ID` (numéro de la tâche). Sans elles, la boîte affiche un message d'explication et ne plante pas.

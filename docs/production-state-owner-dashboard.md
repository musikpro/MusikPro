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

## Rapport « en ligne » pour la production

`npm run deploy:production` envoie le dossier local à Vercel, `generated/production-doctor.json` compris : la page État production affiche donc le dernier rapport généré sur la machine avant le déploiement. Pour que le voyant Multi-tenant (RLS/policies Neon) passe au vert avec la **vraie** base de production, régénérer le rapport avec un fichier d'environnement de production gardé hors du dépôt :

```bash
DOCTOR_ENV_FILE=~/musikpro-prod.env npm run doctor:production:online
npm run deploy:production
```

Le fichier doit contenir au minimum `DATABASE_URL`, `DATABASE_URL_DIRECT` et `APP_URL=https://…`. Sans `DOCTOR_ENV_FILE`, le doctor lit `.env.local` comme avant. À refaire avant chaque déploiement, sinon la carte repasse à l'orange.

## Contrôle de régression

`npm run kit:integrity` échoue si le menu ou la page disparaît. Le Production Doctor contient également le contrôle `owner-production-state`, afin que l'absence du menu apparaisse comme un blocage de préparation.

# Staging Vercel obligatoire avant Production

Le kit impose désormais : **local → Vercel Preview/Staging → validation → Production**. Une branche Git non-production ou `vercel` sans `--prod` crée le staging.

## Commandes

```bash
npm run staging:check
npm run staging:deploy
npm run staging:test -- --url=https://votre-preview.vercel.app
npm run staging:approve -- --url=https://votre-preview.vercel.app
npm run deploy:production:check
npm run deploy:production
```

## Validation staging

Avant approbation, tester au minimum : accueil, `/api/health`, `/api/readyz`, authentification, base, email, responsive mobile/desktop, parcours métier, SEO et paiements seulement s’ils sont activés.

Les variables **Preview** et **Production** doivent rester séparées. Utiliser des secrets distincts par environnement et, lorsque possible, une base Neon de staging séparée afin de ne jamais tester sur les données de production.

`staging:approve` écrit `generated/staging-approval.json`. Le gate production refuse de continuer si ce fichier manque ou si le commit Git a changé depuis l’approbation.

Pour une Preview contenant des données sensibles, activer Deployment Protection/Vercel Authentication dans Vercel.

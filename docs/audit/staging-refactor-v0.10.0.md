# Africa SaaS Kit V0.10.0 — Refactorisation Staging

## Objectif
Imposer un passage par une Vercel Preview/Staging avant tout déploiement Production.

## Garde-fous ajoutés
- `staging:check` vérifie la structure du pipeline.
- `staging:deploy` crée une Preview Vercel (sans `--prod`).
- `staging:test` teste la racine, `/api/health` et `/api/readyz`.
- `staging:approve` enregistre l’URL et le commit validés.
- `deploy:production:check` bloque la Production si l’approbation manque ou si le commit a changé.
- `deploy:production` ne lance `vercel --prod` qu’après le gate.

Les tests fonctionnels humains (auth, responsive, email, métier, paiements optionnels) restent nécessaires avant l’approbation.

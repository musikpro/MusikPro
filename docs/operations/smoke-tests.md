# Smoke tests système

Démarrer le SaaS puis lancer :

```bash
npm run dev
# autre terminal
npm run smoke:system
```

Pour un staging/preview :

```bash
SMOKE_BASE_URL=https://preview.example.com npm run smoke:system
```

Le script contrôle `/api/health`, `/api/readyz`, la surface Better Auth, `robots.txt` et `sitemap.xml`. Il ne crée aucun compte et n'effectue aucun paiement.

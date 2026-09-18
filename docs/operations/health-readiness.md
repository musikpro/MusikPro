# Health & readiness

Africa SaaS Kit expose deux sondes JSON sans authentification :

- `GET /api/health` — **liveness**. Répond 200 tant que le processus Next.js fonctionne. Ne contacte aucun fournisseur externe.
- `GET /api/readyz` — **readiness**. Vérifie Neon et, uniquement s'il est configuré, Upstash Redis. Répond 503 quand une dépendance configurée nécessaire n'est pas disponible.

Ces endpoints ne renvoient jamais de connection string, token, nom de base ou détail d'exception.

En développement, `/api/readyz` reste naturellement à 503 tant que Neon n'est pas configuré. C'est un signal d'installation, pas un crash du kit.

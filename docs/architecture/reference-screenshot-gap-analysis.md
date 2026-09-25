# Analyse des références de starter

Les captures de référence ont inspiré plusieurs améliorations, adaptées à l'architecture Africa SaaS Kit.

## Ajouté

- `/api/health` pour la liveness.
- `/api/readyz` pour Neon et Upstash lorsqu'il est configuré.
- statut clair des services requis/recommandés/optionnels sur le dashboard local.
- `DATABASE_URL_DIRECT` recommandé pour les migrations Drizzle.
- migrations Drizzle versionnées sous `db/migrations/`.
- Vitest et tests unitaires des garde-fous sensibles.
- ESLint Next.js + contrôle de format + audit npm en CI.
- `npm run routes:list` pour inventorier la surface API réellement livrée.
- documentation « ce que le starter embarque ».

## Non copié volontairement

- **Prisma** : Africa SaaS Kit utilise Drizzle ORM pour le socle; Prisma est réservé au CRUD Clients post-Banani.
- **JWT_SECRET maison** : l'authentification utilise Better Auth et `BETTER_AUTH_SECRET`.
- **paiements obligatoires** : ils restent optionnels et reportés en Phase 15.
- **Redis obligatoire** : Upstash reste optionnel; si configuré et indisponible, `/api/readyz` passe à 503.

## Encore optionnel / non câblé

`SENTRY_DSN` reste un emplacement réservé tant qu'une intégration Sentry complète n'a pas été explicitement ajoutée. Le kit ne doit pas afficher Sentry comme opérationnel simplement parce qu'une variable existe.

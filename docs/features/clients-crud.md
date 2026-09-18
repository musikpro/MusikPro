# CRUD Clients — post-Banani

Cette brique est volontairement placée **après l'import réel des écrans Banani**. Les écrans déterminent où la liste, le formulaire et la fiche Client seront branchés; l'API et le modèle ne doivent pas dicter le design.

## Architecture

- Modèle Prisma : `prisma/schema.prisma` → `Client`
- Prisma singleton : `lib/prisma.ts`
- Validation Zod : `lib/validation/clients.ts`
- Repository avec contexte RLS : `lib/clients/repository.ts`
- Collection : `GET /api/clients`, `POST /api/clients`
- Élément : `GET /api/clients/:id`, `PATCH /api/clients/:id`, `DELETE /api/clients/:id`
- Migration + RLS : `prisma/migrations/20260912000000_clients_crud/migration.sql`

## Sécurité

Toutes les routes exigent une session Better Auth. Les mutations vérifient origine, taille et Content-Type. Les entrées sont validées avec Zod. Les requêtes Prisma s'exécutent dans une transaction qui définit `app.current_user_id`; la policy PostgreSQL RLS limite ensuite l'accès au propriétaire.

## Ordre d'installation

1. Terminer `/import-banani` et `npm run import-banani:check`.
2. Installer/générer Prisma (`npm install`, puis `npm run clients:crud:generate`).
3. Appliquer la migration sur une base de développement avec `npm run clients:crud:migrate`.
4. Exécuter `npm run clients:crud:check`.
5. Brancher les écrans Banani sur les routes `/api/clients/*`.
6. Tester deux comptes distincts et confirmer qu'un utilisateur ne peut ni lire ni modifier le Client d'un autre.

> Le kit conserve Drizzle pour ses modules existants. Prisma est ici une brique ciblée pour le CRUD Clients demandé; ne pas migrer les autres modules vers Prisma sans décision explicite.

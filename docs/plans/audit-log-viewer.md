# Audit Log Viewer

- Statut : LIVRÉ (rendu visuel à valider sur staging)
- Créé : 2026-10-16
- Workflow : **PLAN → SPEC → TEST → CODE → VERIFY**

## Objectif / problème

`writeAuditLog` (lib/security/audit.ts) est appelé par ~20 actions admin (utilisateurs, rôles, plans, coupons, corbeille, langues, réglages…) et écrit dans `audit_logs`, mais aucun écran ne permet de le lire. Créer `/admin/audit` : journal consultable (filtres acteur / action / période), paginé, avec export CSV.

## Réutilisation / anti-doublons

`observability-core` et `lib/security/audit.ts` (écriture inchangée), `lib/admin/pagination.ts`, `escapeLike` de `lib/admin/generations.ts`, classes `.admin-panel`, `.admin-data-table`, `.admin-pagination` de `admin.css`, `AdminPage`/`AdminPageHeader`, `AdminTableSkeleton`. Aucun second mécanisme d'écriture ni de lecture d'audit. `security_events` (autre table) reste hors périmètre.

## Périmètre

Page serveur `/admin/audit` (filtres en GET, URL partageable) ; route `GET /api/admin/audit/export` (CSV) ; lecture `lib/admin/audit.ts` ; schéma Zod `lib/validation/audit-filters.ts` ; export CSV pur `lib/admin/audit-csv.ts` ; entrée de menu « Journal d'audit » (Système) ; `loading.tsx` ; enregistrement dans `config/features.json` et `config/security-routes.json` ; tests unitaires.

## Hors périmètre

Modification de `writeAuditLog` ou du schéma `audit_logs` ; ajout de nouvelles actions journalisées ; suppression/édition d'entrées (le journal est en lecture seule) ; `security_events` ; traduction (l'admin reste en français).

## Données / migrations

Aucune migration : lecture seule de `audit_logs` (+ jointure `user` pour nom/e-mail de l'acteur). Rollback : retirer la page, la route et l'entrée de menu.

## API / contrats

`GET /api/admin/audit/export?actor&action&from&to` → `text/csv; charset=utf-8` en pièce jointe, 10 000 lignes max (les plus récentes). Erreurs : 401 non connecté, 403 non autorisé, 400 filtres invalides, 429 trop de requêtes, 503 limiteur indisponible. Chaque export écrit lui-même une entrée `audit.exported`.

## Auth / rôles / multi-tenant

Réservé au Super Admin (`hasAppRole(role, "admin")`) : le journal contient des e-mails et adresses IP. Page : `requireAdmin()` (inclut le double facteur propriétaire) puis contrôle Super Admin ; route d'export : session + rôle + double facteur. Pas de logique multi-tenant : le journal admin est global (lecture via `getServiceDb`, comme les autres pages admin).

## Entrées non fiables / sécurité

Paramètres d'URL validés par Zod (`auditFiltersSchema` : longueurs bornées, dates `YYYY-MM-DD` réelles, `from ≤ to`, page entière bornée). Recherche via `ilike` avec `escapeLike` (pas de SQL concaténé). Export : neutralisation des cellules commençant par `= + - @` (injection de formules tableur), limite de lignes, `Cache-Control: no-store`, rate limiting distribué. Métadonnées affichées en texte (React échappe), tronquées.

## Plan de tests avant code

- [ ] Nominal : filtres valides parsés ; CSV avec en-têtes et lignes
- [ ] Invalide : date impossible, `from > to`, action avec caractères interdits, page négative
- [ ] Autorisation : non connecté 401, non Super Admin 403 (route) / redirection (page)
- [ ] Anti-régression : `writeAuditLog` inchangé ; menu et autres pages admin intacts ; gates du kit PASS

## Critères d'acceptation

- [ ] `/admin/audit` liste les entrées du plus récent au plus ancien, filtrables par acteur, action et période, paginées
- [ ] L'export CSV respecte les mêmes filtres et neutralise les formules
- [ ] Seul un Super Admin accède à la page et à l'export
- [ ] Aucun comportement existant cassé
- [ ] features:check, security:baseline, validation:zod-check, refactor:check, ui:icons-check, typecheck, tests, build PASS

## Plan d'implémentation

1. Schéma Zod + helpers purs (filtres, CSV) + tests
2. Lecture `lib/admin/audit.ts`
3. Page, loading, styles `.admin-audit-*`
4. Route d'export + registre `security-routes.json`
5. Menu, `features.json`, gates, build

## Rollback / réversibilité

Changement additif sans migration : revert du commit suffit, aucune donnée touchée.

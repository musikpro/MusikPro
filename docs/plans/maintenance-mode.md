# Maintenance Mode

- Statut : EN COURS
- Créé : 2026-10-16
- Workflow : **PLAN → SPEC → TEST → CODE → VERIFY**

## Objectif / problème

Pouvoir mettre MusikPro en maintenance depuis l'admin (interrupteur + message optionnel) : les visiteurs et clients voient une page « Maintenance en cours » (HTTP 503 + Retry-After, noindex) pendant que le propriétaire garde l'accès à l'administration, à la connexion, aux webhooks de paiement et aux tâches planifiées.

## Réutilisation / anti-doublons

Modèle `payment_bypass_settings` (réglage global monoligne, `lib/settings/payment-bypass.ts`), `AdminActionForm` + toast, `writeAuditLog` (journal `/admin/audit`), `proxy.ts` (point d'entrée unique des requêtes, déjà responsable de CSP/locale/garde dashboard), `resolvePageLocale` + `translateForLocale` pour la page publique. Aucun second mécanisme de garde d'accès.

## Périmètre

Table `maintenance_settings` (migration additive) ; lecture légère dans `proxy.ts` avec cache mémoire court (5 s) et échec ouvert ; fonctions pures `lib/maintenance/paths.ts` (chemins exemptés) ; page publique `/maintenance` ; page admin `/admin/maintenance` (activer/désactiver + message, confirmation à l'activation) ; entrée de menu Système ; enregistrements `features.json`, `security-rls.json`, `security-routes.json` si nécessaire ; tests.

## Hors périmètre

Contournement de la maintenance pour un compte admin sur le site client (l'admin voit comme un client) ; planification d'une fenêtre de maintenance ; modification de la garde dashboard/admin existante ; traduction du message saisi par l'admin (contenu libre, jamais traduit).

## Données / migrations

`0086_maintenance_mode.sql` : `CREATE TABLE maintenance_settings (id 'global', enabled, message, enabled_by → user, enabled_at, updated_at)` + ligne `global` désactivée + GRANT SELECT runtime / SELECT,INSERT,UPDATE service (même schéma que payment_bypass_settings). Rollback : `DROP TABLE` possible sans effet sur les autres tables ; sans la ligne ou en cas d'erreur de lecture, le site reste ouvert (échec ouvert).

## API / contrats

Aucune nouvelle route API. Comportement du proxy quand la maintenance est active : pages → réécriture vers `/maintenance` en 503 (`Retry-After: 300`, `Cache-Control: no-store`, `X-Robots-Tag: noindex`) ; `/api/*` non exemptées → JSON `{error}` en 503. Jamais bloqués : `/admin`, `/api/admin`, `/login` et pages de mot de passe, `/two-factor`, `/api/auth`, `/api/webhooks`, `/api/cron`, `/api/health`, `/api/readyz`, `/api/i18n/overlay`, `/maintenance`, `robots.txt`, `sitemap.xml`, manifest et images de partage.

## Auth / rôles / multi-tenant

Bascule réservée au Super Admin (`requireAdmin()` + `hasAppRole(role, "admin")`) ; double facteur propriétaire inclus via `requireAdmin()`. Réglage global, pas de multi-tenant. Chaque bascule est journalisée (`maintenance.enabled` / `maintenance.disabled`).

## Entrées non fiables / sécurité

Formulaire validé par Zod côté serveur (booléen, message ≤ 500 caractères, confirmation obligatoire à l'activation) ; message affiché comme texte (React échappe). Le proxy ne fait confiance à aucun en-tête client. Risque principal = s'enfermer dehors : `/admin`, `/login`, `/api/auth` et `/api/admin` sont exemptés par construction (testé), et la lecture en échec ouvert évite qu'une panne base ne coupe le site. Les webhooks de paiement et le cron restent actifs pour ne perdre aucun paiement.

## Plan de tests avant code

- [ ] Nominal : chemins exemptés / bloqués ; schéma de formulaire valide
- [ ] Invalide : message trop long, activation sans confirmation, segments proches (`/adminx`, `/api/authx`)
- [ ] Autorisation : réservé au Super Admin
- [ ] Anti-régression : proxy inchangé quand la maintenance est désactivée ; gates du kit PASS ; vérification réelle 503 en local

## Critères d'acceptation

- [ ] Interrupteur dans /admin/maintenance, avec toast et entrée au journal d'audit
- [ ] Maintenance active : pages clientes en 503 avec la page dédiée, API client en 503 JSON, admin et connexion accessibles
- [ ] Webhooks, cron et santé restent joignables
- [ ] Maintenance désactivée : comportement strictement identique à avant
- [ ] Aucun comportement existant cassé ; gates PASS

## Plan d'implémentation

1. Fonctions pures + schéma Zod + tests
2. Schéma Drizzle + migration 0086 (appliquée sur la branche de développement uniquement)
3. Lecture proxy (cache 5 s, échec ouvert) + intégration dans `proxy.ts`
4. Page publique `/maintenance`
5. Page admin + action + menu
6. Registres, gates, vérification réelle en local, PR

## Rollback / réversibilité

Désactiver l'interrupteur (ou supprimer la ligne `global`) rétablit le site immédiatement (≤ 5 s). Revert du commit retire proxy/page/menu ; la table peut rester sans effet.

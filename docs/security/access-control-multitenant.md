# RBAC et isolation multi-tenant

Africa SaaS Kit utilise deux niveaux complémentaires :

- **RBAC application** : rôles `user` / `admin`, avec `requireAdmin()` côté serveur.
- **RBAC organisation** : rôles `owner` / `admin` / `member`, vérifiés par `requireOrganizationAccess()` avant toute opération qui reçoit un `organizationId`.

## Règle d'isolation

Un identifiant d'organisation reçu du navigateur n'est jamais considéré comme une autorisation. Toute route ou Server Action liée à une organisation doit vérifier le membership de l'utilisateur côté serveur.

Les tables métier critiques disposent d'un `organization_id` lorsqu'un scope tenant est pertinent. La baseline PostgreSQL RLS utilise `app.user_id` et `app.organization_id` pour empêcher les lectures/écritures inter-tenant lorsque RLS est activé avec un rôle runtime non propriétaire.

## Voyants

- `npm run access:check` valide la structure RBAC + multi-tenant dans le code.
- `npm run security:db-check` valide en ligne que RLS et les policies sont réellement actives dans Neon.
- **État production** ne doit afficher le multi-tenant en vert qu'après cette vérification DB online.

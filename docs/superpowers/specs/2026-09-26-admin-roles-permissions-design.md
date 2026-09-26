# Rôles & permissions admin — fondations (V1)

Date : 2026-09-26
Statut : approuvé par le propriétaire (design conversationnel), en attente de revue du présent document.

## Contexte

La page `/admin/roles` affiche aujourd'hui un message « Source métier à connecter » : le modèle
d'autorisation actuel ne distingue que deux rôles (`user` / `admin`), alors que la maquette Banani
importée pour cet écran (`design/banani/imported-design.json`, écran `AdminRolesAccess.jsx`) montre
cinq rôles nommés (Super Admin, Admin Contenu, Admin Paiements, Support Client, Modérateur) et une
« Matrice de permissions ». Aucun JSX ni capture détaillée n'accompagne cette maquette — seuls les
noms de rôles et leurs descriptions courtes sont une donnée de conception réelle ; le détail des
permissions est à définir.

## Objectif de cette itération (V1 — fondations)

- Introduire les 5 rôles de la maquette Banani dans le modèle d'autorisation.
- Définir, dans le code, une matrice permissions × rôle crédible et réutilisable plus tard.
- Rendre `/admin/roles` fidèle au design (rôles dynamiques, équipe, matrice en lecture seule).
- Permettre l'attribution de ces rôles depuis `/admin/users`.

**Non-objectif explicite de cette itération** : restreindre l'accès réel aux pages/actions admin
selon le rôle. Tout compte disposant d'un des 5 rôles admin garde, comme aujourd'hui, un accès
complet à `/admin` — le cloisonnement page par page est un chantier ultérieur, une fois ce modèle
validé à l'usage. Ce choix a été fait explicitement par le propriétaire du produit pour limiter le
risque de cette itération (pas d'audit immédiat des ~20 pages admin existantes).

## Modèle de rôles

`lib/auth/permissions.ts` — `AppRole` passe de 2 à 6 valeurs :

```ts
export const APP_ROLES = ["user", "admin", "admin_content", "admin_payments", "support", "moderator"] as const;
export type AppRole = (typeof APP_ROLES)[number];
```

`admin` reste la valeur littérale existante (Super Admin) — **aucune donnée existante ne change**.
Les 4 nouvelles valeurs s'ajoutent ; la colonne `user.role` reste un `text` libre (Better Auth), donc
**aucune migration Drizzle n'est nécessaire**.

`AdminAppRole` désigne `Exclude<AppRole, "user">` (les 5 rôles admin) — utilisé pour tout ce qui n'a
pas de sens pour un simple `user` (métadonnées d'affichage, matrice de permissions).

Métadonnées d'affichage (nouveau, dans le même fichier) :

```ts
export const ADMIN_ROLE_META: Record<AdminAppRole, { label: string; description: string }> = {
  admin: { label: "Super Admin", description: "Accès complet à tous les systèmes." },
  admin_content: { label: "Admin Contenu", description: "Gestion des modèles IA et contenus." },
  admin_payments: { label: "Admin Paiements", description: "Gestion des transactions et facturations." },
  support: { label: "Support Client", description: "Support utilisateurs et résolution problèmes." },
  moderator: { label: "Modérateur", description: "Modération du contenu utilisateur." },
};
export const ADMIN_ROLES = Object.keys(ADMIN_ROLE_META) as AdminAppRole[];
export function isAdminRole(role: string | null | undefined): boolean {
  return ADMIN_ROLES.includes((role ?? "user") as AdminAppRole);
}
```

`hasAppRole(role, expected)` (comparaison exacte, y compris support CSV historique du plugin admin
Better Auth) est **conservée telle quelle** — elle reste le bon outil pour les points d'appel qui
doivent rester strictement liés au Super Admin (voir plus bas). `isAdminRole` est la nouvelle
fonction pour « est-ce un membre de l'équipe admin, quel que soit son rôle précis ».

## Modules de permission et matrice

7 modules, définis dans le code (pas en base) :

| Module | Couvre (pages/actions existantes) |
|---|---|
| `settings` | `/admin/settings`, `/admin/branding`, `/admin/integrations`, `/admin/mobile-apps`, `/admin/phone-prefixes` |
| `users` | `/admin/users` |
| `roles` | `/admin/roles` (gestion des rôles elle-même) |
| `payments` | `/admin/payment-providers`, `/admin/payments`, `/admin/coupons`, `/admin/plans`, `/admin/credits`, `/admin/ai-credits` |
| `content_catalog` | `/admin/languages`, `/admin/library`, `/admin/occasions`, `/admin/recipient-relations`, `/admin/music-styles`, `/admin/ai-providers` |
| `moderation` | `/admin/ai-providers/moderation`, `/admin/generations` |
| `analytics` | `/admin/analytics`, `/admin/funnel`, `/admin/production-doctor` |

`PermissionModule` désigne l'union des 7 clés ci-dessus (`"settings" | "users" | "roles" | "payments"
| "content_catalog" | "moderation" | "analytics"`), et `ALL_MODULES` la liste complète de ces 7 clés.

Matrice rôle → modules (première proposition, ajustable en revue de code — non gravée, puisque non
appliquée en V1) :

| Rôle | Modules |
|---|---|
| Super Admin (`admin`) | tous |
| Admin Contenu (`admin_content`) | `content_catalog`, `moderation` |
| Admin Paiements (`admin_payments`) | `payments`, `analytics` |
| Support Client (`support`) | `users`, `analytics` |
| Modérateur (`moderator`) | `moderation` |

```ts
export const ROLE_PERMISSIONS: Record<AdminAppRole, PermissionModule[]> = {
  admin: [...ALL_MODULES],
  admin_content: ["content_catalog", "moderation"],
  admin_payments: ["payments", "analytics"],
  support: ["users", "analytics"],
  moderator: ["moderation"],
};
```

Un test unitaire vérifie l'invariant « Super Admin contient tous les modules définis » pour éviter
un oubli lors de l'ajout futur d'un module.

## Traitement des ~8 points d'appel du rôle admin existants

Vérifié individuellement (pas de remplacement systématique) :

**Élargis à `isAdminRole` (parité d'accès V1 — les 5 rôles admin gardent un accès équivalent à
aujourd'hui)** :
- `lib/auth/session.ts` → `requireAdmin()`
- `lib/auth/destination.ts` → `authenticatedDestination()` (redirection post-connexion vers `/admin`)
- `app/api/admin/ai/music-style-description/route.ts` → garde d'accès à cette API admin

**Volontairement gardés en `hasAppRole(role, "admin")` strict (Super Admin uniquement)** — ce sont
des fonctionnalités **owner-only** par construction, pas des fonctionnalités « admin » génériques :
- `app/dashboard/layout.tsx` (`isOwnerAccount`) et `app/api/songs/generate/route.ts` (`isOwner`) :
  contournement de paiement pour test. Élargir donnerait des générations gratuites illimitées aux
  4 nouveaux rôles — régression de revenu inacceptable.
- `lib/auth/owner-two-factor.ts` et `app/dashboard/security/page.tsx` : 2FA obligatoire
  « propriétaire » (`OWNER_TWO_FACTOR_ONLY`, messages « réservé aux propriétaires »). Fonctionnalité
  explicitement scopée au seul Super Admin dans le code existant.

**Conséquence assumée et validée avec le propriétaire** : en V1, les comptes Support/Modérateur/
Admin Contenu/Admin Paiements ont un accès complet à `/admin` sans que le 2FA obligatoire (qui
protège aujourd'hui le compte `admin`) ne s'applique à eux. Le propriétaire a choisi d'activer le
2FA de son côté séparément plutôt que d'étendre ce mécanisme aux 4 nouveaux rôles dans cette
itération.

## Interface

**`/admin/roles`** (`app/admin/roles/page.tsx`) :
- « Rôles disponibles » : boucle dynamique sur `ADMIN_ROLE_META` (+ `user`) au lieu du JSX statique
  à 2 entrées actuel.
- Nouvelle section « Matrice de permissions » : tableau rôle × module en **lecture seule** (reflet
  direct de `ROLE_PERMISSIONS`), avec icône de coche.
- « Équipe administratrice » : la requête s'élargit de `eq(user.role, "admin")` à
  `inArray(user.role, ADMIN_ROLES)` ; chaque ligne affiche le badge de son rôle précis au lieu du
  libellé fixe « Administrateur ».
- `AdminSourceNotice` supprimée (source connectée).

**`/admin/users`** :
- `components/admin/AdminUsersTable.tsx` : `roleOptions` passe de 2 à 6 entrées (`ADMIN_ROLE_META` +
  « Utilisateur »).
- `app/admin/users/actions.ts` :
  - `roleSchema` : `z.enum(["user", "admin", "admin_content", "admin_payments", "support", "moderator"])`.
  - Garde-fou anti-auto-verrouillage généralisé : on ne peut plus se rétrograder **soi-même** vers
    `user`, mais on peut désormais basculer son propre compte entre les 5 rôles admin (aucun risque
    de perte d'accès en V1 puisqu'ils sont tous équivalents pour `/admin`). C'est un assouplissement
    délibéré par rapport au garde-fou actuel (qui bloquait tout changement hors `admin` pour
    soi-même), cohérent avec le nouveau modèle.
- `app/admin/users/page.tsx` : le compteur « Admins » de la page utilise `isAdminRole(entry.role)`
  au lieu de `entry.role === "admin"`, pour refléter l'ensemble de l'équipe admin.

Toutes ces pages restent hors périmètre i18n (admin uniquement, cf. CLAUDE.md).

## Tests

- Nouveau `tests/admin-roles-permissions.test.ts` : `isAdminRole()` (cas `admin`, `support`, `user`,
  `null`), invariant « Super Admin contient tous les modules de `ALL_MODULES` », et cohérence
  `ADMIN_ROLES`/`ADMIN_ROLE_META` (mêmes clés).
- `tests/owner-two-factor.test.ts` et `tests/musikpro-demo.test.ts` : aucune modification attendue,
  doivent continuer à passer sans changement (les fonctions qu'ils couvrent restent en `hasAppRole`
  strict).

## Hors périmètre (explicitement reporté)

- Cloisonnement réel de l'accès aux pages/actions admin selon le rôle.
- UI d'édition de la matrice de permissions (elle reste en lecture seule, pilotée par le code).
- Attribution de plusieurs rôles simultanés à un même compte (sélection reste single-select).
- Extension du 2FA obligatoire aux 4 nouveaux rôles.
- Exploitation des tables `organization`/`member`/`team` de Better Auth (déjà provisionnées mais
  inutilisées) — le modèle reste un simple champ `role` sur `user`, un système multi-équipes/
  multi-tenant n'étant pas un besoin actuel de MusikPro.

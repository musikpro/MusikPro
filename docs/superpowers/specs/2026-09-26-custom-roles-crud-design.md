# Rôles personnalisés — création / édition / suppression (V1.5)

> **Pour les workers agentiques :** REQUIRED SUB-SKILL : utiliser superpowers:writing-plans pour transformer cette spec en plan d'implémentation tâche par tâche.

## Contexte

Le chantier précédent (spec `2026-09-26-admin-roles-permissions-design.md`) a livré une fondation RBAC **V1** : 5 rôles admin fixes définis dans le code (`lib/auth/permissions.ts`), une matrice de permissions **purement décorative** (aucune page ni route n'applique de contrôle par module — confirmé par grep exhaustif : `ROLE_PERMISSIONS` n'est lu que par `/admin/roles` pour l'affichage), et un accès `/admin` binaire via `isAdminRole()` (107 points d'appel via `requireAdmin()`, tous équivalents entre les 5 rôles).

L'import Banani du même jour a ensuite révélé deux écrans réellement sélectionnés — `AdminCreateNewRole.jsx` et `AdminEditRole.jsx` — montrant un système de **rôles personnalisés créés/modifiés/supprimés par l'admin**, avec sélection de couleur, 8 permissions cochables, et une liste de membres assignés. Après présentation du gap-analysis, l'utilisateur a d'abord choisi de rester sur la V1, puis est revenu dessus : il veut désormais adapter ces deux écrans à `/admin/roles`, en retirant tout ce qui ne correspond à rien de réel dans le produit (rôle d'exemple fictif, 8 permissions inventées ne correspondant pas à nos modules, faux membres).

Cadrage validé en chat avec l'utilisateur avant l'écriture de cette spec (voir points 1 à 6 ci-dessous, repris tels quels).

## Objectif de cette itération (V1.5 — rôles personnalisés additifs)

Rendre la création/édition/suppression de rôle **réelle**, sans toucher aux 5 rôles système ni à leur traitement de sécurité déjà durci (Super-Admin-only sur `setRole`/`deleteUser`, config `adminRoles: ["admin"]` de better-auth intouchée). Les permissions par module restent **affichées mais non appliquées** — exactement le même niveau d'engagement que la matrice V1 aujourd'hui pour les 5 rôles système ; ce chantier ne construit pas de cloisonnement réel (toujours volontairement hors périmètre, comme décidé lors du chantier précédent).

## Modèle de données

Nouvelle table Drizzle, additive, dans `db/schema/index.ts` (à la suite de `auditLogs`, même style que les tables existantes) :

```ts
export const customRoles = pgTable("custom_role", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  color: text("color").notNull().default("orange"),
  /** Sous-ensemble de PermissionModule (lib/auth/permissions.ts), stocké tel quel — décoratif comme le reste de la matrice. */
  permissions: jsonb("permissions").notNull().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

- `id` : `randomUUID()` généré côté action, comme `plans`/`coupons`/`auditLogs`.
- Migration générée avec `npm run db:generate` (drizzle-kit introspecte le schéma TS, aucune connexion DB nécessaire) ; le fichier obtiendra le prochain numéro après `0027_sleepy_lester.sql`. Application (`npm run db:migrate`) laissée à l'environnement de dev/staging réel de l'utilisateur, comme pour les autres migrations du kit — pas de DB disponible dans cet environnement d'exécution.
- Pas de contrainte d'unicité sur `name` : c'est un libellé d'affichage, pas une clé.

**Lien avec `user.role`** (colonne `text`, nullable, sans contrainte DB — confirmé par lecture de `db/schema/auth.generated.ts`) : un rôle personnalisé est représenté par la chaîne `custom:<id>`, écrite telle quelle dans `user.role` par `auth.api.setRole` (qui écrit la chaîne sans la valider — déjà le comportement actuel, confirmé lors du chantier V1). Le préfixe `custom:` distingue sans ambiguïté un rôle personnalisé d'un rôle système (`admin`, `admin_content`, etc., qui ne contiennent jamais `:`), et reste compatible avec le support multi-rôle CSV déjà géré par `hasAppRole`/`isAdminRole` (`"custom:abc123,admin"` se découpe normalement sur la virgule).

## Adaptation du design Banani — RÉUTILISER / ADAPTER / CRÉER / retiré

| Élément Banani | Décision |
|---|---|
| Formulaire nom/description | RÉUTILISÉ tel quel (champs texte standards) |
| Sélecteur de couleur (6 couleurs) | ADAPTÉ — 6 couleurs propres à notre palette (`orange`, `bleu`, `vert`, `violet`, `rouge`, `gris`), pas les couleurs exactes de la maquette qui ne sont pas documentées dans notre design system |
| 8 permissions cochables | **RETIRÉ tel quel, remplacé** par nos 7 vrais modules (`MODULE_META` : Paramètres, Utilisateurs, Rôles, Paiements, Catalogue & contenu, Modération, Analytique). Les 8 libellés Banani (ex. "Logs d'activité") ne correspondent à aucune page ni fonctionnalité réelle du produit ; les inclure tromperait l'admin qui les cocherait |
| Rôle d'exemple pré-rempli "Modérateur" avec permissions et compteurs fictifs | RETIRÉ — chaque écran charge de vraies données DB |
| "N permissions activées sur 8" | ADAPTÉ → "sur 7" (nombre réel de modules) |
| "Membres assignés" (5 personnes fictives) | ADAPTÉ — vraie requête `user` où `role = 'custom:<id>'` (nom + email réels). Pas d'ajout/retrait de membre depuis cet écran : la réassignation de rôle existe déjà sur `/admin/users` (menu déroulant de rôle) et ce chantier l'étend pour proposer aussi les rôles personnalisés, plutôt que de dupliquer cette gestion sur deux pages |
| "Zone dangereuse" / suppression | RÉUTILISÉ dans l'esprit, ADAPTÉ pour une vraie règle : suppression bloquée si le rôle a encore des membres, avec message explicite (cf. section Sécurité) |
| "État actuel" (créé le / modifié le) | RÉUTILISÉ avec les vraies dates `createdAt`/`updatedAt` de la ligne DB |

## Accès `/admin` pour un rôle personnalisé

`isAdminRole` reste une fonction pure et son usage existant (14 tests dans `tests/admin-roles-permissions.test.ts`) n'est pas modifié : on ajoute un second paramètre optionnel à valeur par défaut vide, donc rétrocompatible à 100 % :

```ts
export function isAdminRole(role: string | null | undefined, extraAdminSlugs: string[] = []): boolean {
  const roles = (role ?? "user").split(",").map((r) => r.trim());
  return roles.some((r) => (ADMIN_ROLES as string[]).includes(r) || extraAdminSlugs.includes(r));
}
```

Nouveau fichier `lib/auth/custom-roles.ts` :

```ts
import { getServiceDb } from "@/db";
import { customRoles } from "@/db/schema";

export async function listCustomRoles() {
  return getServiceDb().select().from(customRoles).orderBy(customRoles.name);
}

export async function getActiveCustomRoleSlugs(): Promise<string[]> {
  const rows = await getServiceDb().select({ id: customRoles.id }).from(customRoles);
  return rows.map((row) => `custom:${row.id}`);
}
```

Points d'appel réels de `isAdminRole` mis à jour pour passer les slugs actifs (comportement identique aux rôles système : accès `/admin` global, cohérent avec la décision validée en chat) :

- `lib/auth/session.ts` (`requireAdmin()`) — 107 pages/actions en dépendent indirectement, aucune ne change de signature.
- `lib/auth/destination.ts` (`authenticatedDestination`) — destination post-connexion.
- `app/admin/users/page.tsx` — comptage "Administrateurs".
- `app/api/admin/ai/music-style-description/route.ts` — marker `isAdminRole` dans `config/security-routes.json` inchangé (le texte `isAdminRole` reste présent dans le fichier).

La config `admin({ defaultRole: "user", adminRoles: ["admin"] })` de `lib/auth/index.ts` **n'est pas touchée** — c'est exactement la zone dont la modification a cassé l'authentification lors du chantier précédent (voir `tests/auth-admin-plugin-config.test.ts`). Ce chantier ne la modifie à aucun moment.

## Actions serveur

Le schéma Zod et le parsing de `FormData` vivent dans un fichier **sans import DB**, pour rester unitairement testables (importer `@/db` lève immédiatement `Missing required environment variable: DATABASE_URL` hors d'un environnement configuré — confirmé sur `db/index.ts:9`, même contrainte déjà rencontrée avec `lib/auth/index.ts` pendant le chantier précédent). Nouveau fichier `lib/validation/custom-roles.ts`, suivant la convention déjà établie (`lib/validation/clients.ts`, AGENTS.md : *"Partager les schémas dans lib/validation/ lorsqu'un contrat sert au client et au serveur"*) :

```ts
import { z } from "zod";
import { ALL_MODULES, type PermissionModule } from "@/lib/auth/permissions";
import { CUSTOM_ROLE_COLORS } from "@/lib/auth/custom-role-colors";

export const customRoleFormSchema = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(300).default(""),
  color: z.enum(CUSTOM_ROLE_COLORS).default("orange"),
  permissions: z.array(z.enum(ALL_MODULES as [PermissionModule, ...PermissionModule[]])).max(ALL_MODULES.length),
});

/** Jamais `Object.fromEntries(formData)` : plusieurs cases "permissions" partagent le même name. */
export function readCustomRoleForm(formData: FormData) {
  return customRoleFormSchema.parse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    color: formData.get("color"),
    permissions: formData.getAll("permissions"),
  });
}
```

`lib/auth/permissions.ts` et `lib/auth/custom-role-colors.ts` n'importent eux-mêmes rien de `@/db` — ce fichier de validation reste donc importable dans un test vitest sans base de données.

Nouveau fichier `app/admin/roles/actions.ts` (les actions de rôles personnalisés n'existaient pas encore ; `app/admin/users/actions.ts` reste pour `setRole`/`deleteUser`) :

```ts
"use server";
import { randomUUID } from "node:crypto";
import { eq, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getServiceDb } from "@/db";
import { customRoles, user } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { hasAppRole } from "@/lib/auth/permissions";
import { readCustomRoleForm } from "@/lib/validation/custom-roles";
import { actionErrorMessage } from "@/lib/admin/action-state";
import { withAdminNotice } from "@/lib/admin/notice-redirect";
import { writeAuditLog } from "@/lib/security/audit";
import type { AdminActionState } from "@/components/admin/useAdminActionToast";

function requireSuperAdmin(role: string | null | undefined) {
  if (!hasAppRole(role, "admin")) throw new Error("Seul un Super Admin peut gérer les rôles personnalisés.");
}

export async function createCustomRole(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    const session = await requireAdmin();
    requireSuperAdmin((session.user as { role?: string }).role);
    const parsed = readCustomRoleForm(formData);
    const id = randomUUID();
    await getServiceDb().insert(customRoles).values({ id, ...parsed });
    await writeAuditLog({
      action: "role.custom.created",
      actorId: session.user.id,
      targetType: "custom_role",
      targetId: id,
      metadata: { name: parsed.name },
    });
    revalidatePath("/admin/roles");
    revalidatePath("/admin/users");
  } catch (error) {
    // Sur cette page, l'échec doit rester visible sans navigation ; on relance pour que
    // AdminActionForm affiche le toast d'erreur au lieu de rediriger vers une page de succès.
    return { ok: false, message: actionErrorMessage(error, "Impossible de créer ce rôle.") };
  }
  redirect(withAdminNotice("/admin/roles", "Rôle créé."));
}

export async function updateCustomRole(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    const session = await requireAdmin();
    requireSuperAdmin((session.user as { role?: string }).role);
    const id = z.string().trim().min(1).max(120).parse(formData.get("id"));
    const parsed = readCustomRoleForm(formData);
    // defaultNow() ne s'applique qu'à l'INSERT ; convention déjà en place (app/admin/coupons/actions.ts,
    // app/admin/ai-providers/actions.ts, ...) : passer updatedAt explicitement à chaque UPDATE.
    await getServiceDb().update(customRoles).set({ ...parsed, updatedAt: new Date() }).where(eq(customRoles.id, id));
    await writeAuditLog({
      action: "role.custom.updated",
      actorId: session.user.id,
      targetType: "custom_role",
      targetId: id,
      metadata: { name: parsed.name },
    });
    revalidatePath("/admin/roles");
    revalidatePath(`/admin/roles/${id}/edit`);
    revalidatePath("/admin/users");
    return { ok: true, message: "Rôle mis à jour." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible d’enregistrer ce rôle.") };
  }
}

export async function deleteCustomRole(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    const session = await requireAdmin();
    requireSuperAdmin((session.user as { role?: string }).role);
    const id = z.string().trim().min(1).max(120).parse(formData.get("id"));
    const slug = `custom:${id}`;
    const [{ value: memberCount }] = await getServiceDb()
      .select({ value: count() })
      .from(user)
      .where(eq(user.role, slug));
    if (Number(memberCount) > 0)
      throw new Error(`Réassignez d’abord les ${memberCount} membre(s) de ce rôle avant de le supprimer.`);
    await getServiceDb().delete(customRoles).where(eq(customRoles.id, id));
    await writeAuditLog({ action: "role.custom.deleted", actorId: session.user.id, targetType: "custom_role", targetId: id });
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible de supprimer ce rôle.") };
  }
  redirect(withAdminNotice("/admin/roles", "Rôle supprimé."));
}
```

Notes :
- `readCustomRoleForm` utilise `formData.getAll("permissions")` (plusieurs cases à cocher partagent `name="permissions"`) — jamais `Object.fromEntries(formData)`, qui écraserait les valeurs multiples.
- `createCustomRole`/`deleteCustomRole` redirigent avec `withAdminNotice` (règle obligatoire du dashboard propriétaire pour toute création/suppression suivie d'un retour sur une autre page) ; `updateCustomRole` reste sur place et retourne l'état pour le toast, comme `updatePlan`.
- Nouveau fichier `lib/auth/custom-role-colors.ts` :
  ```ts
  export const CUSTOM_ROLE_COLORS = ["orange", "bleu", "vert", "violet", "rouge", "gris"] as const;
  export type CustomRoleColor = (typeof CUSTOM_ROLE_COLORS)[number];
  export const CUSTOM_ROLE_COLOR_HEX: Record<CustomRoleColor, string> = {
    orange: "#F26522",
    bleu: "#277EFF",
    vert: "#22C55E",
    violet: "#8B5CF6",
    rouge: "#EF4444",
    gris: "#6B7280",
  };
  ```
  (orange/bleu/vert reprennent des tokens déjà utilisés ailleurs dans le kit — primaire, admin branding, succès ; violet/rouge/gris sont de nouveaux tokens purement décoratifs pour les badges de rôle, sans impact sur le design system existant.)

## `setRole` — accepter un rôle personnalisé

`app/admin/users/actions.ts` change minimal, additif :

```ts
const roleSchema = z.object({
  userId: z.string().min(1).max(120),
  role: z.string().min(1).max(140), // rôle système ("user", "admin", ...) ou "custom:<id>"
});
```

Après le `parse`, avant tout le reste de la logique existante (inchangée : `wouldSelfDemoteToUser`, lookup du rôle actuel, `wouldRemoveLastSuperAdmin`) :

```ts
const knownSystemRoles: string[] = ["user", ...ADMIN_ROLES];
const isCustomRole = parsed.role.startsWith("custom:");
if (!knownSystemRoles.includes(parsed.role) && !isCustomRole) throw new Error("Rôle invalide.");
if (isCustomRole) {
  const customRoleId = parsed.role.slice("custom:".length);
  const [existing] = await getServiceDb().select({ id: customRoles.id }).from(customRoles).where(eq(customRoles.id, customRoleId)).limit(1);
  if (!existing) throw new Error("Ce rôle personnalisé n’existe plus.");
}
```

Le reste de `setRole` (guard Super-Admin, `auth.api.setRole` avec l'assertion de type déjà documentée, `writeAuditLog`, `revalidatePath`) ne change pas.

`components/admin/AdminUsersTable.tsx` : `roleOptions` reçoit une liste étendue construite côté serveur dans `app/admin/users/page.tsx` (rôles système + `{ value: `custom:${role.id}`, label: role.name }` pour chaque rôle personnalisé actif), au lieu de dériver `roleOptions` uniquement de `ADMIN_ROLES` en dur dans le composant.

## Interface

### `/admin/roles` (modifié)

- "Rôles disponibles" : liste actuelle (5 rôles système + "Utilisateur", inchangés, non éditables) suivie des rôles personnalisés chargés depuis `listCustomRoles()`, chacun avec sa pastille de couleur (`CUSTOM_ROLE_COLOR_HEX`). Bouton **« Ajouter un rôle »** en haut de la carte, visible uniquement si `hasAppRole(session role, "admin")` (Super Admin), menant à `/admin/roles/new`.
- Pour chaque rôle personnalisé, si Super Admin : lien "Modifier" vers `/admin/roles/[id]/edit`.
- "Équipe administratrice" : requête étendue à `inArray(user.role, [...ADMIN_ROLES, ...customSlugs])` ; `roleLabel()` étendu pour résoudre un slug `custom:<id>` via une `Map` construite à partir de `listCustomRoles()`.
- "Matrice de permissions" : colonnes existantes (5 rôles système) + une colonne par rôle personnalisé, même rendu (coche/tiret), même mention « lecture seule ».

### `/admin/roles/new` (nouveau, adapté de `AdminCreateNewRole.jsx`)

- `requireAdmin()` puis garde Super-Admin explicite (`redirect("/admin/roles")` si non Super Admin — la page n'est pas accessible du tout aux autres rôles admin, pas seulement le bouton masqué).
- `AdminPage` + `AdminBackLink href="/admin/roles"` + `AdminPageHeader`.
- `<AdminActionForm action={createCustomRole}>` : champ nom, description, sélecteur de couleur (6 boutons radio stylés, valeur = clé `CustomRoleColor`), 7 cases à cocher de permissions avec les vrais libellés `MODULE_META[module].label`.

### `/admin/roles/[id]/edit` (nouveau, adapté de `AdminEditRole.jsx`)

- Mêmes gardes que `/admin/roles/new` ; si l'id n'existe pas dans `custom_role`, redirection vers `/admin/roles`.
- Formulaire pré-rempli via `<AdminActionForm id="edit-role" action={updateCustomRole}>` (nom, description, couleur, permissions, `input type="hidden" name="id"`).
- Panneau "État actuel" : nombre de permissions actives sur 7, nombre réel de membres, `createdAt`/`updatedAt` réels formatés.
- "Membres assignés" : liste réelle (nom, email) des utilisateurs dont `role = custom:<id>` ; lecture seule sur cet écran (la réassignation se fait sur `/admin/users`).
- "Zone dangereuse" : `<AdminActionForm id="delete-role" action={deleteCustomRole}>` avec `input hidden id` ; bouton `form="delete-role"` texte "Supprimer ce rôle" — désactivé (attribut `disabled`) côté rendu si le nombre de membres > 0, avec le message d'explication sous le bouton ; la action serveur revalide de toute façon le compte réel (défense en profondeur, un `disabled` HTML n'empêche pas un appel direct).

## Sécurité

- Toute mutation de rôle personnalisé (créer/modifier/supprimer) exige une session admin (`requireAdmin()`) **et** `hasAppRole(role, "admin")` (Super Admin strict) — même posture que `setRole`/`deleteUser` aujourd'hui, pas d'élargissement.
- La suppression est bloquée côté serveur si des membres restent assignés (jamais seulement côté UI).
- Aucune route API n'est ajoutée (`config/security-routes.json` n'a rien à déclarer ici — uniquement des Server Actions et des Server Components, comme le reste de `/admin/roles`).
- La config `adminRoles` de better-auth reste `["admin"]` ; les rôles personnalisés ne passent jamais par le système de permission interne de better-auth (`hasPermission`), exactement comme les 4 rôles admin non-Super le font déjà aujourd'hui (contournés par nos propres gardes explicites).

## Tests

TDD réel (RED → GREEN) pour tout ce qui est testable sans base de données, à l'image de `tests/admin-roles-permissions.test.ts` :

1. `isAdminRole(role, extraAdminSlugs)` : rétrocompatibilité (appel à un seul argument inchangé, 14 tests existants passent sans modification) + nouveaux cas (`isAdminRole("custom:abc", ["custom:abc"])` → true, `isAdminRole("custom:abc", ["custom:def"])` → false, support CSV `"custom:abc,user"`).
2. `customRoleFormSchema`/`readCustomRoleForm` (`lib/validation/custom-roles.ts`, sans import DB) : nom trop court rejeté, couleur hors énumération rejetée, permissions hors `ALL_MODULES` rejetées, description vide acceptée (`.default("")`), `readCustomRoleForm` gère bien plusieurs valeurs `permissions` via `FormData.getAll`.
3. `CUSTOM_ROLE_COLORS`/`CUSTOM_ROLE_COLOR_HEX` : chaque couleur a une entrée hex, aucune couleur orpheline.
4. Le reste (repository DB, actions serveur, pages) suit le même principe déjà appliqué à `setRole`/`createPlan`/`deletePlan` dans ce kit : non unitairement testable sans base réelle, vérifié par lecture attentive + `tsc --noEmit` + `eslint` + revue finale, pas de test qui mockerait la base de données.

## Hors périmètre (explicitement reporté)

- Cloisonnement réel de `/admin` par module de permission (déjà hors périmètre du chantier V1, toujours vrai ici).
- Édition ou suppression des 5 rôles système.
- Réassignation de membres depuis l'écran d'édition de rôle (reste sur `/admin/users`).
- Renommage/changement de couleur en cascade sur les utilisateurs qui ont déjà ce rôle (pas nécessaire : ils référencent le rôle par `id` via le slug, pas par copie du nom).

# Rôles personnalisés — création / édition / suppression (V1.5) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a Super Admin create, edit and delete custom admin roles (name, description, color, a subset of the 7 real permission modules) from `/admin/roles`, and assign them to users from `/admin/users`, without touching the 5 hardcoded system roles or better-auth's `adminRoles` config.

**Architecture:** A new additive Drizzle table `custom_role` stores custom roles. `user.role` represents a custom role as the string `custom:<id>`. `isAdminRole()` gets a second, backward-compatible parameter so the ~4 real `/admin` access-gating call sites also recognize custom role slugs (fetched from DB), while better-auth's own `adminRoles: ["admin"]` config and the Super-Admin-only guards on `setRole`/`deleteUser` stay untouched.

**Tech Stack:** Next.js App Router (Server Components/Actions), Drizzle ORM (Postgres/Neon), Zod, `AdminActionForm`/`useAdminActionToast` toast pattern, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-26-custom-roles-crud-design.md`

## Global Constraints

- The 5 system roles (`admin`, `admin_content`, `admin_payments`, `support`, `moderator`) stay hardcoded in `lib/auth/permissions.ts`, non-editable, non-deletable.
- `admin({ defaultRole: "user", adminRoles: ["admin"] })` in `lib/auth/index.ts` is **never** modified by this plan (this exact change broke authentication entirely in the prior chantier — see `tests/auth-admin-plugin-config.test.ts`).
- Permission modules stay **decorative** — no task adds real per-module access enforcement.
- Every mutation on the owner dashboard reports through `AdminActionForm` + `useAdminActionToast` + `AdminActionState` (never a bare `<form action={fn}>`, never a silent crash to `app/admin/error.tsx`); a redirect-on-success case uses `redirect(withAdminNotice(path, message))`.
- All untrusted input is validated server-side with Zod.
- No new `app/api/*` route is added — `config/security-routes.json` needs no changes.
- Deleting a custom role that still has assigned members is refused, server-side, unconditionally.
- French only; the admin dashboard is not part of the client-facing i18n system (existing, unchanged convention — `ADMIN_ROLE_META`/`MODULE_META` labels are plain French strings, not wrapped in `translate()`).

## Review Focus

- **Invalid create/edit input** — a Super Admin submits a 1-character name, a color outside the 6 allowed values, or a permission that isn't one of the 7 real modules → a clear toast error, never a crashed page. Test: Task 2 (`customRoleFormSchema`).
- **Deleting a role that still has members** — clicking delete on a custom role with 1+ assigned users must be refused server-side, unconditionally; no row is deleted, no user is left with a dangling role. Test: Task 5.
- **Direct URL access by a non-Super-Admin** — an Admin Contenu (or any non-Super admin role) navigates straight to `/admin/roles/new` or posts to `createCustomRole` without going through the (hidden-to-them) button → blocked by both the page guard and the action guard, never just one. Tests: Task 6 (page guard) and Task 5 (action guard, defense in depth).
- **Custom role deleted between form load and submit** — `setRole` receives `custom:<id>` for an id that no longer exists (race between two admin tabs) → clean rejection ("Ce rôle personnalisé n'existe plus."), the target user's role is left unchanged. Test: Task 9.
- **Renaming an already-assigned custom role** — every place that displays it (`/admin/roles` list, the Rôle column on `/admin/users`, the role dropdown) must reflect the new name immediately (resolved by id on every render, never a name copied at assignment time). Tests: Task 8 (`roleLabel` via a DB-built Map) and Task 9 (`roleOptions` rebuilt on every page load).

---

## Task 1: Table `custom_role` et migration

**Files:**
- Modify: `db/schema/index.ts` (append at end of file, after `musicGenerationJobs`)
- Generate: `db/migrations/00XX_*.sql` (via `npm run db:generate`, filename decided by drizzle-kit)

**Interfaces:**
- Produces: `customRoles` Drizzle table export from `@/db/schema`, columns `id: text`, `name: text`, `description: text`, `color: text`, `permissions: jsonb`, `createdAt: timestamp`, `updatedAt: timestamp`.

- [ ] **Step 1: Add the table definition**

Append to `db/schema/index.ts` (all of `pgTable`, `text`, `timestamp`, `jsonb` are already imported at the top of this file — no import changes needed):

```ts
export const customRoles = pgTable("custom_role", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  color: text("color").notNull().default("orange"),
  /** Subset of PermissionModule keys (lib/auth/permissions.ts) — decorative, like the rest of the matrix. */
  permissions: jsonb("permissions").notNull().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors (the file is additive; drizzle infers `customRoles`' type from the table definition).

- [ ] **Step 3: Generate the migration**

Run: `npm run db:generate`
Expected: a new file appears under `db/migrations/`, numbered after `0027_sleepy_lester.sql`, containing a `CREATE TABLE "custom_role" (...)` statement. This does not require a live database connection (drizzle-kit introspects the TypeScript schema only). Do not run `npm run db:migrate` in this environment — no `DATABASE_URL` is configured here; note in the task-done ledger that migration application is deferred to the user's dev/staging environment.

- [ ] **Step 4: Commit**

```bash
git add db/schema/index.ts db/migrations/
git commit -m "feat: ajouter la table custom_role (rôles personnalisés)"
```

---

## Task 2: Fondations pures — couleurs et validation

**Files:**
- Create: `lib/auth/custom-role-colors.ts`
- Create: `lib/validation/custom-roles.ts`
- Test: `tests/custom-role-colors.test.ts`
- Test: `tests/custom-roles-validation.test.ts`

**Interfaces:**
- Consumes: `ALL_MODULES`, `PermissionModule` from `@/lib/auth/permissions` (already exist, unchanged).
- Produces: `CUSTOM_ROLE_COLORS: readonly string[]`, `CustomRoleColor` type, `CUSTOM_ROLE_COLOR_HEX: Record<CustomRoleColor, string>` from `@/lib/auth/custom-role-colors`; `customRoleFormSchema` (Zod object `{name, description, color, permissions}`) and `readCustomRoleForm(formData: FormData)` from `@/lib/validation/custom-roles` — both later tasks depend on these exact names.

- [ ] **Step 1: Write the failing tests for colors**

Create `tests/custom-role-colors.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { CUSTOM_ROLE_COLORS, CUSTOM_ROLE_COLOR_HEX } from "@/lib/auth/custom-role-colors";

describe("CUSTOM_ROLE_COLORS", () => {
  it("has exactly 6 named colors", () => {
    expect(CUSTOM_ROLE_COLORS).toHaveLength(6);
  });

  it("has a hex value for every color, and no orphan hex entries", () => {
    for (const color of CUSTOM_ROLE_COLORS) {
      expect(CUSTOM_ROLE_COLOR_HEX[color]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
    expect(Object.keys(CUSTOM_ROLE_COLOR_HEX).sort()).toEqual([...CUSTOM_ROLE_COLORS].sort());
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/custom-role-colors.test.ts`
Expected: FAIL — `Cannot find module '@/lib/auth/custom-role-colors'`.

- [ ] **Step 3: Implement**

Create `lib/auth/custom-role-colors.ts`:

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

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/custom-role-colors.test.ts`
Expected: PASS (2/2).

- [ ] **Step 5: Write the failing tests for validation**

Create `tests/custom-roles-validation.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { customRoleFormSchema, readCustomRoleForm } from "@/lib/validation/custom-roles";

function formDataOf(fields: Record<string, string | string[]>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (Array.isArray(value)) for (const v of value) fd.append(key, v);
    else fd.set(key, value);
  }
  return fd;
}

describe("customRoleFormSchema", () => {
  it("accepts a minimal valid role", () => {
    const result = customRoleFormSchema.parse({ name: "Éditeur", color: "orange", permissions: ["users"] });
    expect(result).toEqual({ name: "Éditeur", description: "", color: "orange", permissions: ["users"] });
  });

  it("rejects a name shorter than 2 characters", () => {
    expect(() => customRoleFormSchema.parse({ name: "A", color: "orange", permissions: [] })).toThrow();
  });

  it("rejects a color outside the 6 allowed values", () => {
    expect(() => customRoleFormSchema.parse({ name: "Éditeur", color: "turquoise", permissions: [] })).toThrow();
  });

  it("rejects a permission that isn't one of the 7 real modules", () => {
    expect(() =>
      customRoleFormSchema.parse({ name: "Éditeur", color: "orange", permissions: ["activity_logs"] }),
    ).toThrow();
  });

  it("accepts an empty permissions array", () => {
    const result = customRoleFormSchema.parse({ name: "Éditeur", color: "orange", permissions: [] });
    expect(result.permissions).toEqual([]);
  });
});

describe("readCustomRoleForm", () => {
  it("reads multiple permissions checkboxes sharing the same field name", () => {
    const formData = formDataOf({ name: "Éditeur", color: "vert", permissions: ["users", "payments"] });
    expect(readCustomRoleForm(formData).permissions.sort()).toEqual(["payments", "users"]);
  });

  it("defaults description to an empty string when absent", () => {
    const formData = formDataOf({ name: "Éditeur", color: "vert", permissions: [] });
    expect(readCustomRoleForm(formData).description).toBe("");
  });
});
```

- [ ] **Step 6: Run to verify it fails**

Run: `npx vitest run tests/custom-roles-validation.test.ts`
Expected: FAIL — `Cannot find module '@/lib/validation/custom-roles'`.

- [ ] **Step 7: Implement**

Create `lib/validation/custom-roles.ts`:

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

/** Never `Object.fromEntries(formData)` — several "permissions" checkboxes share the same field name. */
export function readCustomRoleForm(formData: FormData) {
  return customRoleFormSchema.parse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    color: formData.get("color"),
    permissions: formData.getAll("permissions"),
  });
}
```

- [ ] **Step 8: Run to verify it passes**

Run: `npx vitest run tests/custom-role-colors.test.ts tests/custom-roles-validation.test.ts`
Expected: PASS (2/2 and 7/7).

- [ ] **Step 9: Commit**

```bash
git add lib/auth/custom-role-colors.ts lib/validation/custom-roles.ts tests/custom-role-colors.test.ts tests/custom-roles-validation.test.ts
git commit -m "feat: couleurs et validation Zod des rôles personnalisés"
```

---

## Task 3: Extension du modèle de rôles

**Files:**
- Modify: `lib/auth/permissions.ts` (add second param to `isAdminRole`, add `canDeleteCustomRole`)
- Modify: `tests/admin-roles-permissions.test.ts` (add new test cases, keep existing ones unchanged)
- Create: `lib/auth/custom-roles.ts`

**Interfaces:**
- Consumes: `customRoles` table from `@/db/schema` (Task 1), `getServiceDb` from `@/db`.
- Produces: `isAdminRole(role, extraAdminSlugs?: string[])` (2nd param optional, defaults to `[]` — 100% backward compatible), `canDeleteCustomRole(memberCount: number): boolean`, `listCustomRoles(): Promise<{id,name,description,color,permissions,createdAt,updatedAt}[]>`, `getActiveCustomRoleSlugs(): Promise<string[]>` (each slug formatted `custom:<id>`) from `@/lib/auth/custom-roles` — Task 4 consumes `getActiveCustomRoleSlugs`; Task 5 consumes `canDeleteCustomRole`; Task 8 consumes `listCustomRoles`.

- [ ] **Step 1: Write the failing tests**

Add to `tests/admin-roles-permissions.test.ts` (append; do not remove or edit any existing `describe` block):

```ts
describe("isAdminRole avec des rôles personnalisés", () => {
  it("reste rétrocompatible sans second argument", () => {
    expect(isAdminRole("admin")).toBe(true);
    expect(isAdminRole("user")).toBe(false);
  });

  it("reconnaît un slug personnalisé listé dans extraAdminSlugs", () => {
    expect(isAdminRole("custom:abc", ["custom:abc"])).toBe(true);
  });

  it("rejette un slug personnalisé absent de extraAdminSlugs", () => {
    expect(isAdminRole("custom:abc", ["custom:def"])).toBe(false);
  });

  it("gère un rôle personnalisé combiné en CSV", () => {
    expect(isAdminRole("custom:abc,user", ["custom:abc"])).toBe(true);
  });
});

describe("canDeleteCustomRole", () => {
  it("autorise la suppression quand il ne reste aucun membre", () => {
    expect(canDeleteCustomRole(0)).toBe(true);
  });

  it("bloque la suppression tant qu'il reste au moins un membre", () => {
    expect(canDeleteCustomRole(1)).toBe(false);
    expect(canDeleteCustomRole(5)).toBe(false);
  });
});
```

Also update the top import to add the two new names:

```ts
import {
  ADMIN_ROLES,
  ADMIN_ROLE_META,
  ALL_MODULES,
  ROLE_PERMISSIONS,
  isAdminRole,
  wouldSelfDemoteToUser,
  wouldRemoveLastSuperAdmin,
  canDeleteCustomRole,
} from "@/lib/auth/permissions";
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/admin-roles-permissions.test.ts`
Expected: FAIL — `canDeleteCustomRole` is not exported, and the new `isAdminRole` cases fail (2-argument calls currently ignore the second argument since it doesn't exist yet — TypeScript will actually fail to compile the test file first with "Expected 1 arguments, but got 2").

- [ ] **Step 3: Implement**

In `lib/auth/permissions.ts`, replace the existing `isAdminRole` function:

```ts
export function isAdminRole(role: string | null | undefined, extraAdminSlugs: string[] = []): boolean {
  const roles = (role ?? "user").split(",").map((r) => r.trim());
  return roles.some((r) => (ADMIN_ROLES as string[]).includes(r) || extraAdminSlugs.includes(r));
}
```

Add at the end of the file:

```ts
export function canDeleteCustomRole(memberCount: number): boolean {
  return memberCount === 0;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/admin-roles-permissions.test.ts`
Expected: PASS (all previous tests + 6 new ones green, no regression on the 14 pre-existing assertions).

- [ ] **Step 5: Create the DB-backed custom role helpers**

Create `lib/auth/custom-roles.ts` (not unit-tested — importing `@/db` requires `DATABASE_URL`, same constraint as every other DB-touching module in this codebase; verified by `tsc`/`eslint` and manual review instead):

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

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 7: Commit**

```bash
git add lib/auth/permissions.ts lib/auth/custom-roles.ts tests/admin-roles-permissions.test.ts
git commit -m "feat: étendre isAdminRole aux rôles personnalisés, ajouter canDeleteCustomRole"
```

---

## Task 4: Brancher les slugs personnalisés sur les points d'accès réels

**Files:**
- Modify: `lib/auth/session.ts:50-60` (`requireAdmin`)
- Modify: `lib/auth/destination.ts` (`authenticatedDestination`)
- Modify: `app/(auth)/auth/continue/page.tsx:10` (single call site of `authenticatedDestination`)
- Modify: `app/admin/users/page.tsx:15` (admins count)
- Modify: `app/api/admin/ai/music-style-description/route.ts` (admin guard)
- Modify: `tests/auth-destination.test.ts` (adapt to the new async signature)

**Interfaces:**
- Consumes: `getActiveCustomRoleSlugs()` from `@/lib/auth/custom-roles` (Task 3), `isAdminRole(role, extraSlugs)` (Task 3).
- Produces: `requireAdmin()` keeps its existing return type (`Awaited<ReturnType<typeof requireUser>>`) — no caller of `requireAdmin()` changes. `authenticatedDestination` gets the same optional second parameter as `isAdminRole` and **stays synchronous and DB-free** — `tests/auth-destination.test.ts` currently imports it directly with zero DB dependency (confirmed by reading the file: it calls `authenticatedDestination("admin")` etc. synchronously), and must keep working unmodified. Fetching the custom role slugs is the caller's job, exactly like `requireAdmin()` already does for `isAdminRole`.

- [ ] **Step 1: Update `requireAdmin`**

In `lib/auth/session.ts`, add the import and update the function:

```ts
import { isAdminRole } from "@/lib/auth/permissions";
import { getActiveCustomRoleSlugs } from "@/lib/auth/custom-roles";
```

```ts
export async function requireAdmin() {
  const session = await requireUser();
  const role = (session.user as { role?: string }).role;
  if (!isAdminRole(role, await getActiveCustomRoleSlugs())) redirect("/dashboard");
  const twoFactorEnabled = Boolean((session.user as { twoFactorEnabled?: boolean }).twoFactorEnabled);
  const policy = securityPolicy[getSecurityLevel()];
  if (ownerTwoFactorEnabled() && policy.requireAdmin2FA && !twoFactorEnabled) {
    redirect("/dashboard/security?required=admin-2fa");
  }
  return session;
}
```

- [ ] **Step 2: Update `authenticatedDestination` and its call site**

`lib/auth/destination.ts` must **not** start importing `@/db` — doing so would make the currently DB-free `tests/auth-destination.test.ts` fail immediately with `Missing required environment variable: DATABASE_URL` the same way `lib/auth/index.ts` did in the prior chantier. Instead, mirror `isAdminRole`'s own pattern exactly: add an optional parameter, keep the function pure and synchronous, and let the (single) caller fetch the slugs:

```ts
import { isAdminRole } from "@/lib/auth/permissions";

export function authenticatedDestination(role: string | null | undefined, extraAdminSlugs: string[] = []) {
  return isAdminRole(role, extraAdminSlugs) ? "/admin" : "/dashboard";
}
```

In `app/(auth)/auth/continue/page.tsx`, add the import and fetch the slugs before calling it:

```ts
import { getActiveCustomRoleSlugs } from "@/lib/auth/custom-roles";
```

```ts
const role = (session.user as { role?: string }).role;
redirect(authenticatedDestination(role, await getActiveCustomRoleSlugs()));
```

- [ ] **Step 3: Update the admins count on `/admin/users`**

In `app/admin/users/page.tsx`, add the import and change the count line:

```ts
import { isAdminRole } from "@/lib/auth/permissions";
import { getActiveCustomRoleSlugs } from "@/lib/auth/custom-roles";
```

```ts
const adminSlugs = await getActiveCustomRoleSlugs();
const admins = users.filter((entry) => isAdminRole(entry.role, adminSlugs)).length;
```

- [ ] **Step 4: Update the admin AI route guard**

In `app/api/admin/ai/music-style-description/route.ts`, find the existing `isAdminRole(role)` call and pass the extra slugs the same way (import `getActiveCustomRoleSlugs` from `@/lib/auth/custom-roles`, `await` it before the check). This keeps the `isAdminRole` marker string in `config/security-routes.json` unchanged.

- [ ] **Step 5: Extend the destination test**

`authenticatedDestination` stayed synchronous and pure (Step 2), so the 3 existing `it` blocks in `tests/auth-destination.test.ts` need no change at all. Add one new case to the existing `describe("authenticatedDestination", ...)` block, right after the "4 nouveaux rôles admin" test:

```ts
it("envoie aussi un rôle personnalisé listé en extraAdminSlugs vers le tableau de bord propriétaire", () => {
  expect(authenticatedDestination("custom:abc", ["custom:abc"])).toBe("/admin");
  expect(authenticatedDestination("custom:abc", ["custom:def"])).toBe("/dashboard");
});
```

- [ ] **Step 6: Run the full suite**

Run: `npx vitest run`
Expected: all tests pass except any that were already failing before this task for unrelated reasons (there should be none — the full suite was green at the end of the prior chantier).

- [ ] **Step 7: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add lib/auth/session.ts lib/auth/destination.ts "app/(auth)/auth/continue/page.tsx" app/admin/users/page.tsx app/api/admin/ai/music-style-description/route.ts tests/auth-destination.test.ts
git commit -m "feat: reconnaître les rôles personnalisés dans les gardes d'accès /admin"
```

---

## Task 5: Actions serveur — créer / modifier / supprimer un rôle personnalisé

**Files:**
- Create: `app/admin/roles/actions.ts`

**Interfaces:**
- Consumes: `readCustomRoleForm` (Task 2), `canDeleteCustomRole` (Task 3), `hasAppRole` (existing, unchanged), `customRoles`/`user` from `@/db/schema`, `requireAdmin` (Task 4), `actionErrorMessage`, `withAdminNotice`, `writeAuditLog`, `AdminActionState` (all existing, unchanged).
- Produces: `createCustomRole`, `updateCustomRole`, `deleteCustomRole` — each `(previous: AdminActionState, formData: FormData) => Promise<AdminActionState>` — consumed by Tasks 6 and 7.

- [ ] **Step 1: Write the file**

Create `app/admin/roles/actions.ts`:

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
import { hasAppRole, canDeleteCustomRole } from "@/lib/auth/permissions";
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
    // defaultNow() only applies on INSERT; existing convention (app/admin/coupons/actions.ts,
    // app/admin/ai-providers/actions.ts, ...) is to pass updatedAt explicitly on every UPDATE.
    await getServiceDb()
      .update(customRoles)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(customRoles.id, id));
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
    if (!canDeleteCustomRole(Number(memberCount)))
      throw new Error(`Réassignez d’abord les ${memberCount} membre(s) de ce rôle avant de le supprimer.`);
    await getServiceDb().delete(customRoles).where(eq(customRoles.id, id));
    await writeAuditLog({
      action: "role.custom.deleted",
      actorId: session.user.id,
      targetType: "custom_role",
      targetId: id,
    });
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible de supprimer ce rôle.") };
  }
  redirect(withAdminNotice("/admin/roles", "Rôle supprimé."));
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `npx eslint app/admin/roles/actions.ts`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/admin/roles/actions.ts
git commit -m "feat: actions serveur pour créer/modifier/supprimer un rôle personnalisé"
```

---

## Task 6: Page `/admin/roles/new`

**Files:**
- Create: `components/admin/AdminCustomRoleForm.tsx`
- Create: `app/admin/roles/new/page.tsx`
- Modify: `app/admin/admin.css` (append new rules, do not edit existing ones)

**Interfaces:**
- Consumes: `createCustomRole` (Task 5), `updateCustomRole` (Task 5, used by Task 7 with the same form component), `CUSTOM_ROLE_COLORS`/`CUSTOM_ROLE_COLOR_HEX` (Task 2), `ALL_MODULES`/`MODULE_META` from `@/lib/auth/permissions` (existing), `AdminActionForm`, `AdminBackLink`, `AdminPage`, `AdminPageHeader`, `Icon` (existing).
- Produces: `AdminCustomRoleForm` component, reused as-is by Task 7 with a `role` prop for pre-filling.

- [ ] **Step 1: Add the shared form component**

Create `components/admin/AdminCustomRoleForm.tsx`:

```tsx
"use client";

import AdminActionForm from "@/components/admin/AdminActionForm";
import { AdminBackLink } from "@/components/admin/AdminPage";
import Icon from "@/components/banani/Icon";
import { ALL_MODULES, MODULE_META } from "@/lib/auth/permissions";
import { CUSTOM_ROLE_COLORS, CUSTOM_ROLE_COLOR_HEX, type CustomRoleColor } from "@/lib/auth/custom-role-colors";
import type { AdminActionState } from "@/components/admin/useAdminActionToast";

export type CustomRoleFormValue = {
  id: string;
  name: string;
  description: string;
  color: CustomRoleColor;
  permissions: string[];
};

export default function AdminCustomRoleForm({
  action,
  role,
}: {
  action: (previous: AdminActionState, formData: FormData) => Promise<AdminActionState>;
  role?: CustomRoleFormValue;
}) {
  return (
    <AdminActionForm action={action} className="admin-editor-grid">
      {role ? <input type="hidden" name="id" value={role.id} /> : null}
      <label className="admin-editor-field is-wide">
        <span>Nom du rôle</span>
        <input name="name" required minLength={2} maxLength={60} defaultValue={role?.name} placeholder="Ex. Éditeur" />
      </label>
      <label className="admin-editor-field is-wide">
        <span>Description</span>
        <textarea
          name="description"
          maxLength={300}
          rows={3}
          defaultValue={role?.description}
          placeholder="À quoi sert ce rôle ?"
        />
      </label>
      <div className="admin-editor-field is-wide">
        <span>Couleur</span>
        <div className="admin-color-options">
          {CUSTOM_ROLE_COLORS.map((color) => (
            <label className="admin-color-option" key={color}>
              <input type="radio" name="color" value={color} defaultChecked={(role?.color ?? "orange") === color} />
              <span className="admin-color-swatch" style={{ background: CUSTOM_ROLE_COLOR_HEX[color] }} />
              {color}
            </label>
          ))}
        </div>
      </div>
      <div className="admin-editor-field is-wide">
        <span>Permissions</span>
        {ALL_MODULES.map((module) => (
          <label className="admin-editor-check" key={module}>
            <input type="checkbox" name="permissions" value={module} defaultChecked={role?.permissions.includes(module)} />
            <span>{MODULE_META[module].label}</span>
          </label>
        ))}
      </div>
      <div className="admin-editor-actions is-wide">
        <AdminBackLink href="/admin/roles" label="Annuler" />
        <button type="submit">
          <Icon i={role ? "save" : "plus"} size={17} />
          {role ? "Enregistrer les modifications" : "Créer le rôle"}
        </button>
      </div>
    </AdminActionForm>
  );
}
```

- [ ] **Step 2: Add the CSS for the color picker**

Append to `app/admin/admin.css`:

```css
.admin-color-options {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.admin-color-option {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--admin-border);
  border-radius: 999px;
  cursor: pointer;
  text-transform: capitalize;
}

.admin-color-option input {
  margin: 0;
}

.admin-color-swatch {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  display: inline-block;
}
```

- [ ] **Step 3: Add the page**

Create `app/admin/roles/new/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import AdminCustomRoleForm from "@/components/admin/AdminCustomRoleForm";
import { AdminBackLink, AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { requireAdmin } from "@/lib/auth/session";
import { hasAppRole } from "@/lib/auth/permissions";
import { createCustomRole } from "../actions";

export default async function AdminNewCustomRolePage() {
  const session = await requireAdmin();
  if (!hasAppRole((session.user as { role?: string }).role, "admin")) redirect("/admin/roles");
  return (
    <AdminPage>
      <AdminBackLink href="/admin/roles" />
      <AdminPageHeader
        eyebrow="Rôles & accès"
        title="Ajouter un rôle"
        description="Crée un rôle personnalisé avec son propre jeu de permissions."
      />
      <section className="admin-panel admin-editor-card">
        <AdminCustomRoleForm action={createCustomRole} />
      </section>
    </AdminPage>
  );
}
```

- [ ] **Step 4: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint components/admin/AdminCustomRoleForm.tsx app/admin/roles/new/page.tsx`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/admin/AdminCustomRoleForm.tsx app/admin/roles/new/page.tsx app/admin/admin.css
git commit -m "feat: page de création d'un rôle personnalisé"
```

---

## Task 7: Page `/admin/roles/[id]/edit`

**Files:**
- Create: `app/admin/roles/[id]/edit/page.tsx`
- Modify: `app/admin/admin.css` (append new rules)

**Interfaces:**
- Consumes: `AdminCustomRoleForm` (Task 6), `updateCustomRole`/`deleteCustomRole` (Task 5), `customRoles`/`user` from `@/db/schema`.

- [ ] **Step 1: Add the page**

Create `app/admin/roles/[id]/edit/page.tsx`:

```tsx
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { getServiceDb } from "@/db";
import { customRoles, user } from "@/db/schema";
import AdminActionForm from "@/components/admin/AdminActionForm";
import AdminCustomRoleForm from "@/components/admin/AdminCustomRoleForm";
import { AdminBackLink, AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import Icon from "@/components/banani/Icon";
import { requireAdmin } from "@/lib/auth/session";
import { hasAppRole, ALL_MODULES } from "@/lib/auth/permissions";
import type { CustomRoleFormValue } from "@/components/admin/AdminCustomRoleForm";
import { updateCustomRole, deleteCustomRole } from "../../actions";

export default async function AdminEditCustomRolePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireAdmin();
  if (!hasAppRole((session.user as { role?: string }).role, "admin")) redirect("/admin/roles");
  const db = getServiceDb();
  const [role] = await db.select().from(customRoles).where(eq(customRoles.id, id)).limit(1);
  if (!role) notFound();
  const slug = `custom:${id}`;
  const members = await db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(eq(user.role, slug));
  const permissions = Array.isArray(role.permissions) ? (role.permissions as string[]) : [];
  const deleteFormId = `delete-role-${id}`;
  return (
    <AdminPage>
      <AdminBackLink href="/admin/roles" />
      <AdminPageHeader eyebrow="Rôles & accès" title={`Modifier « ${role.name} »`} description={role.description || "Rôle personnalisé"} />
      <section className="admin-insight-grid">
        <article className="admin-panel admin-editor-card">
          <AdminCustomRoleForm
            action={updateCustomRole}
            role={{
              id: role.id,
              name: role.name,
              description: role.description,
              color: role.color as CustomRoleFormValue["color"],
              permissions,
            }}
          />
        </article>
        <article className="admin-panel">
          <div className="admin-panel-heading">
            <div>
              <span className="admin-panel-icon">
                <Icon i="info" size={18} />
              </span>
              <div>
                <h2>État actuel</h2>
                <p>Résumé du rôle</p>
              </div>
            </div>
          </div>
          <dl className="admin-role-summary">
            <div>
              <dt>Membres</dt>
              <dd>{members.length}</dd>
            </div>
            <div>
              <dt>Permissions actives</dt>
              <dd>{permissions.length} sur {ALL_MODULES.length}</dd>
            </div>
            <div>
              <dt>Créé le</dt>
              <dd>{new Date(role.createdAt).toLocaleDateString("fr-FR")}</dd>
            </div>
            <div>
              <dt>Modifié le</dt>
              <dd>{new Date(role.updatedAt).toLocaleDateString("fr-FR")}</dd>
            </div>
          </dl>
        </article>
      </section>
      <article className="admin-panel">
        <div className="admin-panel-heading">
          <div>
            <span className="admin-panel-icon">
              <Icon i="users" size={18} />
            </span>
            <div>
              <h2>Membres assignés</h2>
              <p>{members.length} compte{members.length > 1 ? "s" : ""}</p>
            </div>
          </div>
        </div>
        {members.length ? (
          <div className="admin-record-list">
            {members.map((member) => (
              <div className="admin-record" key={member.id}>
                <div>
                  <strong>{member.name}</strong>
                  <small>{member.email}</small>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="admin-empty-state">
            <Icon i="users" size={22} />
            <strong>Aucun membre</strong>
            <p>Assigne ce rôle depuis la page Utilisateurs.</p>
          </div>
        )}
      </article>
      <article className="admin-panel admin-danger-zone">
        <h3>Zone dangereuse</h3>
        <AdminActionForm id={deleteFormId} action={deleteCustomRole}>
          <input type="hidden" name="id" value={role.id} />
        </AdminActionForm>
        <p>
          {members.length
            ? `Réassigne d’abord les ${members.length} membre(s) de ce rôle depuis la page Utilisateurs avant de pouvoir le supprimer.`
            : "Cette action est définitive."}
        </p>
        <button type="submit" form={deleteFormId} className="admin-secondary-action is-danger" disabled={members.length > 0}>
          <Icon i="trash-2" size={16} />
          Supprimer ce rôle
        </button>
      </article>
    </AdminPage>
  );
}
```

- [ ] **Step 2: Add the CSS for the danger zone**

Append to `app/admin/admin.css`:

```css
.admin-danger-zone {
  border-color: var(--admin-danger);
}

.admin-danger-zone h3 {
  color: var(--admin-danger);
  margin: 0 0 8px;
}
```

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint "app/admin/roles/[id]/edit/page.tsx"`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "app/admin/roles/[id]/edit/page.tsx" app/admin/admin.css
git commit -m "feat: page d'édition et de suppression d'un rôle personnalisé"
```

---

## Task 8: Mise à jour de `/admin/roles`

**Files:**
- Modify: `app/admin/roles/page.tsx`

**Interfaces:**
- Consumes: `listCustomRoles` (Task 3), `CUSTOM_ROLE_COLOR_HEX` (Task 2), `ALL_MODULES`/`MODULE_META`/`ADMIN_ROLES`/`ADMIN_ROLE_META`/`ROLE_PERMISSIONS` (existing, unchanged).

- [ ] **Step 1: Read the current file**

Read `app/admin/roles/page.tsx` in full before editing (already known from the spec/exploration, but re-read to catch any drift since Task 4 didn't touch this file).

- [ ] **Step 2: Extend the query and add the custom roles**

Replace the imports and the `admins` query:

```tsx
import { desc, inArray } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { user } from "@/db/schema";
import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import Icon from "@/components/banani/Icon";
import { requireAdmin } from "@/lib/auth/session";
import { getNameInitials } from "@/lib/profile/name-initials";
import { listCustomRoles } from "@/lib/auth/custom-roles";
import { CUSTOM_ROLE_COLOR_HEX, type CustomRoleColor } from "@/lib/auth/custom-role-colors";
import {
  ADMIN_ROLES,
  ADMIN_ROLE_META,
  ALL_MODULES,
  MODULE_META,
  ROLE_PERMISSIONS,
  hasAppRole,
  type AdminAppRole,
} from "@/lib/auth/permissions";

export default async function AdminRolesPage() {
  const session = await requireAdmin();
  const isSuperAdmin = hasAppRole((session.user as { role?: string }).role, "admin");
  const db = getServiceDb();
  const customRolesList = await listCustomRoles();
  const customSlugs = customRolesList.map((role) => `custom:${role.id}`);
  const admins = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      verified: user.emailVerified,
      createdAt: user.createdAt,
      role: user.role,
    })
    .from(user)
    .where(inArray(user.role, [...ADMIN_ROLES, ...customSlugs]))
    .orderBy(desc(user.createdAt));
  const customRoleBySlug = new Map(customRolesList.map((role) => [`custom:${role.id}`, role]));
  const roleLabel = (role: string | null) => {
    if (role && role in ADMIN_ROLE_META) return ADMIN_ROLE_META[role as AdminAppRole].label;
    if (role && customRoleBySlug.has(role)) return customRoleBySlug.get(role)!.name;
    return "Rôle inconnu";
  };
```

Keep the rest of the function body (the `return (<AdminPage>...` JSX) but apply the following targeted changes inside it.

- [ ] **Step 3: Add the "Ajouter un rôle" action and the custom roles list**

Change the header:

```tsx
<AdminPageHeader
  eyebrow="Sécurité"
  title="Rôles & accès"
  description="Consulte les rôles disponibles, l’équipe administratrice et la matrice de permissions."
  action={isSuperAdmin ? { href: "/admin/roles/new", label: "Ajouter un rôle" } : undefined}
/>
```

Extend the "Rôles disponibles" list, right after the `ADMIN_ROLES.map(...)` block and before the hardcoded "Utilisateur" entry:

```tsx
{customRolesList.map((role) => (
  <div key={role.id}>
    <span style={{ color: CUSTOM_ROLE_COLOR_HEX[role.color as CustomRoleColor] }}>
      <Icon i="tag" size={17} />
    </span>
    <div>
      <strong>{role.name}</strong>
      <small>{role.description || "Rôle personnalisé"}</small>
    </div>
    {isSuperAdmin ? (
      <a href={`/admin/roles/${role.id}/edit`} className="admin-secondary-action">
        Modifier
      </a>
    ) : null}
  </div>
))}
```

- [ ] **Step 4: Extend the permission matrix**

In the matrix `<thead>`, after the `ADMIN_ROLES.map((role) => <th key={role}>...)` block:

```tsx
{customRolesList.map((role) => (
  <th key={role.id}>{role.name}</th>
))}
```

In the matrix `<tbody>`, after the `ADMIN_ROLES.map((role) => <td...)` block, inside the same row:

```tsx
{customRolesList.map((role) => {
  const permissions = Array.isArray(role.permissions) ? (role.permissions as string[]) : [];
  return (
    <td key={role.id} style={{ textAlign: "center" }}>
      {permissions.includes(module) ? <Icon i="check" size={16} /> : <span aria-hidden="true">—</span>}
    </td>
  );
})}
```

- [ ] **Step 5: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint app/admin/roles/page.tsx`
Expected: no errors.

- [ ] **Step 6: Manual read-through**

Re-read the full modified file once to confirm the "Équipe administratrice" section still uses `roleLabel(entry.role)` (unchanged call site, now resolving custom roles too) and that no `ADMIN_ROLES`-only assumption remains uncovered.

- [ ] **Step 7: Commit**

```bash
git add app/admin/roles/page.tsx
git commit -m "feat: afficher et gérer les rôles personnalisés sur /admin/roles"
```

---

## Task 9: Intégration `/admin/users` — assigner un rôle personnalisé

**Files:**
- Modify: `app/admin/users/actions.ts` (`setRole`)
- Modify: `app/admin/users/page.tsx` (build extended `roleOptions`)
- Modify: `components/admin/AdminUsersTable.tsx` (accept `roleOptions` prop, resolve role label for display)

**Interfaces:**
- Consumes: `listCustomRoles` (Task 3), `customRoles` from `@/db/schema`.
- Produces: `AdminUsersTable` now takes a `roleOptions: { value: string; label: string }[]` prop instead of computing it internally — this is a breaking change to that component's props, contained entirely within this task (its single caller, `app/admin/users/page.tsx`, is updated in the same task).

- [ ] **Step 1: Extend `setRole`'s validation**

In `app/admin/users/actions.ts`, change the schema and add the runtime check. First, update the imports:

```ts
import { eq, count } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { user, customRoles } from "@/db/schema";
import { ADMIN_ROLES, hasAppRole, wouldRemoveLastSuperAdmin, wouldSelfDemoteToUser } from "@/lib/auth/permissions";
```

Replace `roleSchema`:

```ts
const roleSchema = z.object({
  userId: z.string().min(1).max(120),
  role: z.string().min(1).max(140), // rôle système ("user", "admin", ...) ou "custom:<id>"
});
```

Inside `setRole`, right after `const parsed = roleSchema.parse(...)` and before the `wouldSelfDemoteToUser` check, insert:

```ts
const knownSystemRoles: string[] = ["user", ...ADMIN_ROLES];
const isCustomRole = parsed.role.startsWith("custom:");
if (!knownSystemRoles.includes(parsed.role) && !isCustomRole) throw new Error("Rôle invalide.");
if (isCustomRole) {
  const customRoleId = parsed.role.slice("custom:".length);
  const [existing] = await getServiceDb()
    .select({ id: customRoles.id })
    .from(customRoles)
    .where(eq(customRoles.id, customRoleId))
    .limit(1);
  if (!existing) throw new Error("Ce rôle personnalisé n’existe plus.");
}
```

Leave every other line of `setRole` (the `wouldSelfDemoteToUser` guard, the target-role lookup, `wouldRemoveLastSuperAdmin`, the `auth.api.setRole` call and its type assertion, `writeAuditLog`, `revalidatePath`) exactly as-is.

- [ ] **Step 2: Build the extended role options on the page**

In `app/admin/users/page.tsx`, add the import and build `roleOptions`:

```ts
import { ADMIN_ROLES, ADMIN_ROLE_META, isAdminRole } from "@/lib/auth/permissions";
import { listCustomRoles } from "@/lib/auth/custom-roles";
```

```ts
const customRolesList = await listCustomRoles();
const roleOptions = [
  { value: "user", label: "Utilisateur" },
  ...ADMIN_ROLES.map((role) => ({ value: role, label: ADMIN_ROLE_META[role].label })),
  ...customRolesList.map((role) => ({ value: `custom:${role.id}`, label: role.name })),
];
```

Pass it down: `<AdminUsersTable roleOptions={roleOptions} twoFactorAvailable={...} rows={...} />`.

Update the admins count from Task 4 to also cover this same fetch (avoid fetching custom roles twice — reuse `customRolesList` for the `adminSlugs` computed in Task 4):

```ts
const adminSlugs = customRolesList.map((role) => `custom:${role.id}`);
const admins = users.filter((entry) => isAdminRole(entry.role, adminSlugs)).length;
```

(This replaces the `getActiveCustomRoleSlugs()` call added in Task 4 for this specific file only, since `listCustomRoles()` is now already being fetched here for `roleOptions` — no need to query custom roles twice on the same page render.)

- [ ] **Step 3: Update `AdminUsersTable` to accept `roleOptions` and resolve labels**

In `components/admin/AdminUsersTable.tsx`, remove the module-level `roleOptions` constant and its `ADMIN_ROLES, ADMIN_ROLE_META` import, and accept it as a prop instead:

```tsx
export default function AdminUsersTable({
  rows,
  roleOptions,
  twoFactorAvailable,
}: {
  rows: AdminUserRow[];
  roleOptions: { value: string; label: string }[];
  twoFactorAvailable: boolean;
}) {
```

Build a lookup once inside the component, right after the existing `filtered` memo:

```tsx
const roleLabelByValue = useMemo(() => new Map(roleOptions.map((option) => [option.value, option.label])), [roleOptions]);
```

The current file has exactly one place that displays the raw role string: the desktop table's `<td>{row.role}</td>` (the mobile card's `<dl>` shows Inscription/Vérification/2FA only — no role field to fix there). Replace that single line with:

```tsx
<td>{roleLabelByValue.get(row.role) ?? row.role}</td>
```

- [ ] **Step 4: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint app/admin/users/actions.ts app/admin/users/page.tsx components/admin/AdminUsersTable.tsx`
Expected: no errors.

- [ ] **Step 5: Manual verification of the race-condition guard**

Re-read the `setRole` diff to confirm: submitting `role=custom:doesnotexist` throws `"Ce rôle personnalisé n’existe plus."`, caught by the existing `try/catch`, rendered through `actionErrorMessage` — this is the Review Focus item "custom role deleted between form load and submit." No automated test is added for this specific path (it requires a live database), but the logic is the same shape as the already-tested `wouldRemoveLastSuperAdmin` guard one line below it.

- [ ] **Step 6: Run the full suite**

Run: `npx vitest run`
Expected: all tests pass (no regression).

- [ ] **Step 7: Commit**

```bash
git add app/admin/users/actions.ts app/admin/users/page.tsx components/admin/AdminUsersTable.tsx
git commit -m "feat: assigner un rôle personnalisé depuis /admin/users"
```

---

## Final checks (after Task 9)

- `npm run kit:integrity`
- `npm run kit:audit`
- `npx vitest run` (full suite)
- `npx tsc --noEmit`
- Manual note in the final report: `npm run db:migrate` still needs to run against a real dev/staging database before any of this is usable end-to-end — this plan generates the migration file but cannot apply it in this sandboxed environment (no `DATABASE_URL`).

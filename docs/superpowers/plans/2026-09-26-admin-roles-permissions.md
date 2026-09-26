# Rôles & permissions admin — fondations (V1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduire les 5 rôles admin de la maquette Banani (Super Admin, Admin Contenu, Admin Paiements, Support Client, Modérateur) dans le modèle d'autorisation de MusikPro, avec une matrice de permissions définie dans le code et affichée sur `/admin/roles`, sans migration ni cloisonnement d'accès réel pour cette itération.

**Architecture:** `lib/auth/permissions.ts` devient la source de vérité unique du modèle de rôles (métadonnées d'affichage, modules de permission, matrice rôle→modules, prédicats purs testables). Les points d'appel existants sont soit élargis à `isAdminRole()` (parité d'accès V1), soit volontairement laissés en `hasAppRole(role, "admin")` strict quand ils protègent une fonctionnalité owner-only (contournement de paiement, 2FA obligatoire). `/admin/roles` et `/admin/users` deviennent des vues dynamiques de ce modèle au lieu de listes statiques à 2 entrées.

**Tech Stack:** Next.js App Router (Server Components + Server Actions), Drizzle ORM / Neon Postgres (aucune migration dans ce plan), Better Auth (`admin` plugin, colonne `user.role` en `text` libre), Zod, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-26-admin-roles-permissions-design.md`

## Global Constraints

- Réponses, libellés UI et commentaires en français (CLAUDE.md).
- Aucune migration Drizzle — la colonne `user.role` reste un `text` libre ; les 4 nouvelles valeurs de rôle sont de simples nouvelles chaînes.
- `admin` (Super Admin) reste la valeur littérale existante — les comptes admin actuels ne changent pas.
- Pas de cloisonnement d'accès aux pages/actions admin selon le rôle en V1 — les 5 rôles admin gardent tous un accès `/admin` complet, comme aujourd'hui.
- Ces 4 points d'appel restent **volontairement** en `hasAppRole(role, "admin")` strict (Super Admin uniquement) et ne doivent **pas** être modifiés par ce plan : `app/dashboard/layout.tsx` (`isOwnerAccount`), `app/api/songs/generate/route.ts` (`isOwner`), `lib/auth/owner-two-factor.ts`, `app/dashboard/security/page.tsx`.
- Sélection de rôle reste single-select (pas de nouveau rôle CSV multi-valeurs).
- La matrice de permissions est affichée en lecture seule (pas d'UI d'édition dans cette itération).
- Après chaque tâche : `npx tsc --noEmit` doit rester à 0 erreur et `npx eslint` sur les fichiers touchés doit rester à 0 erreur (règle de refactorisation non régressive, CLAUDE.md).
- Ces pages restent hors périmètre i18n (admin uniquement, déjà confirmé dans une itération précédente de ce projet).

## Review Focus

- **Perte du dernier compte Super Admin** : si le seul compte `role = "admin"` restant est rétrogradé (par lui-même ou par un autre admin) vers un rôle non-`admin`, le contournement de paiement et le 2FA obligatoire « propriétaire » cessent silencieusement de s'appliquer à quiconque. Le garde-fou existant ne protégeait que l'auto-rétrogradation vers `user` ; il doit être étendu pour bloquer aussi la disparition du dernier Super Admin. Testé dans Task 1 (`wouldRemoveLastSuperAdmin`) et câblé dans Task 4.
- **Rôle CSV hérité du plugin Better Auth** (ex. `"user,admin"`, déjà utilisé dans un test existant) : `isAdminRole` doit continuer à le reconnaître comme admin, comme le fait déjà `hasAppRole`. Testé dans Task 1.
- **Auto-changement de rôle vers un autre rôle admin** (ex. Super Admin qui bascule lui-même vers Support) : ne doit plus être bloqué par le garde-fou généralisé, puisque tous les rôles admin sont équivalents pour l'accès `/admin` en V1. Testé dans Task 1 (`wouldSelfDemoteToUser`) et Task 4.
- **Rôle inconnu ou `null` en base** (compte legacy sans valeur de rôle explicite) affiché dans « Équipe administratrice » : ne doit pas faire planter le rendu de `/admin/roles`. Couvert par un repli explicite dans Task 7.
- **Cohérence de la matrice de permissions** : si un module est ajouté un jour à `MODULE_META` sans mettre à jour `ROLE_PERMISSIONS.admin`, le Super Admin perdrait silencieusement un accès qu'il devrait avoir. Testé dans Task 1 (invariant « Super Admin contient tous les modules »).

---

### Task 1: Modèle de rôles et permissions (`lib/auth/permissions.ts`)

**Files:**
- Modify: `lib/auth/permissions.ts` (fichier actuel de 6 lignes, remplacé intégralement)
- Test: `tests/admin-roles-permissions.test.ts` (nouveau)

**Interfaces:**
- Produces: `AppRole` (type), `AdminAppRole` (type), `PermissionModule` (type), `MODULE_META: Record<PermissionModule, { label: string }>`, `ALL_MODULES: PermissionModule[]`, `ADMIN_ROLE_META: Record<AdminAppRole, { label: string; description: string; icon: string }>`, `ADMIN_ROLES: AdminAppRole[]`, `ROLE_PERMISSIONS: Record<AdminAppRole, PermissionModule[]>`, `hasAppRole(role, expected: AppRole): boolean` (signature inchangée), `isAdminRole(role: string | null | undefined): boolean`, `wouldSelfDemoteToUser(actingUserId: string, targetUserId: string, nextRole: AppRole): boolean`, `wouldRemoveLastSuperAdmin(remainingSuperAdminCount: number, targetCurrentRole: string | null | undefined, nextRole: AppRole): boolean`.

- [ ] **Step 1: Écrire les tests (RED)**

Créer `tests/admin-roles-permissions.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import {
  ADMIN_ROLES,
  ADMIN_ROLE_META,
  ALL_MODULES,
  ROLE_PERMISSIONS,
  isAdminRole,
  wouldSelfDemoteToUser,
  wouldRemoveLastSuperAdmin,
} from "@/lib/auth/permissions";

describe("isAdminRole", () => {
  it("reconnaît chacun des 5 rôles admin", () => {
    for (const role of ADMIN_ROLES) {
      expect(isAdminRole(role)).toBe(true);
    }
  });

  it("rejette le rôle user, une valeur vide et une valeur inconnue", () => {
    expect(isAdminRole("user")).toBe(false);
    expect(isAdminRole(null)).toBe(false);
    expect(isAdminRole(undefined)).toBe(false);
    expect(isAdminRole("stagiaire")).toBe(false);
  });

  it("reconnaît un rôle admin combiné en CSV (héritage Better Auth)", () => {
    expect(isAdminRole("user,support")).toBe(true);
  });
});

describe("ROLE_PERMISSIONS", () => {
  it("couvre exactement les mêmes clés que ADMIN_ROLES", () => {
    expect(Object.keys(ROLE_PERMISSIONS).sort()).toEqual([...ADMIN_ROLES].sort());
  });

  it("donne au Super Admin l'accès à tous les modules définis", () => {
    expect(ROLE_PERMISSIONS.admin.sort()).toEqual([...ALL_MODULES].sort());
  });

  it("ne référence que des modules existants pour chaque rôle", () => {
    for (const role of ADMIN_ROLES) {
      for (const module of ROLE_PERMISSIONS[role]) {
        expect(ALL_MODULES).toContain(module);
      }
    }
  });
});

describe("ADMIN_ROLE_META", () => {
  it("a un libellé, une description et une icône pour chaque rôle admin", () => {
    for (const role of ADMIN_ROLES) {
      expect(ADMIN_ROLE_META[role].label).toBeTruthy();
      expect(ADMIN_ROLE_META[role].description).toBeTruthy();
      expect(ADMIN_ROLE_META[role].icon).toBeTruthy();
    }
  });
});

describe("wouldSelfDemoteToUser", () => {
  it("bloque un compte qui tente de se rétrograder lui-même vers user", () => {
    expect(wouldSelfDemoteToUser("u1", "u1", "user")).toBe(true);
  });

  it("autorise un compte à changer son propre rôle vers un autre rôle admin", () => {
    expect(wouldSelfDemoteToUser("u1", "u1", "support")).toBe(false);
  });

  it("n'affecte pas le changement de rôle d'un autre compte", () => {
    expect(wouldSelfDemoteToUser("u1", "u2", "user")).toBe(false);
  });
});

describe("wouldRemoveLastSuperAdmin", () => {
  it("bloque quand c'est le dernier Super Admin et qu'il change de rôle", () => {
    expect(wouldRemoveLastSuperAdmin(1, "admin", "support")).toBe(true);
  });

  it("autorise quand il reste d'autres Super Admin", () => {
    expect(wouldRemoveLastSuperAdmin(2, "admin", "support")).toBe(false);
  });

  it("autorise quand la cible n'était pas Super Admin", () => {
    expect(wouldRemoveLastSuperAdmin(1, "support", "moderator")).toBe(false);
  });

  it("autorise quand le nouveau rôle reste admin", () => {
    expect(wouldRemoveLastSuperAdmin(1, "admin", "admin")).toBe(false);
  });
});
```

- [ ] **Step 2: Lancer les tests, vérifier qu'ils échouent**

Run: `npx vitest run tests/admin-roles-permissions.test.ts`
Expected: FAIL — `ADMIN_ROLES` (et le reste) n'existent pas encore dans `lib/auth/permissions.ts`.

- [ ] **Step 3: Implémenter `lib/auth/permissions.ts`**

Remplacer tout le contenu du fichier par :

```ts
export const MODULE_META = {
  settings: { label: "Paramètres" },
  users: { label: "Utilisateurs" },
  roles: { label: "Rôles" },
  payments: { label: "Paiements" },
  content_catalog: { label: "Catalogue & contenu" },
  moderation: { label: "Modération" },
  analytics: { label: "Analytique" },
} as const;

export type PermissionModule = keyof typeof MODULE_META;
export const ALL_MODULES = Object.keys(MODULE_META) as PermissionModule[];

export const ADMIN_ROLE_META = {
  admin: {
    label: "Super Admin",
    description: "Accès complet à tous les systèmes.",
    icon: "shield",
  },
  admin_content: {
    label: "Admin Contenu",
    description: "Gestion des modèles IA et contenus.",
    icon: "sparkles",
  },
  admin_payments: {
    label: "Admin Paiements",
    description: "Gestion des transactions et facturations.",
    icon: "credit-card",
  },
  support: {
    label: "Support Client",
    description: "Support utilisateurs et résolution de problèmes.",
    icon: "headset",
  },
  moderator: {
    label: "Modérateur",
    description: "Modération du contenu utilisateur.",
    icon: "flag",
  },
} as const;

export type AdminAppRole = keyof typeof ADMIN_ROLE_META;
export type AppRole = "user" | AdminAppRole;
export const ADMIN_ROLES = Object.keys(ADMIN_ROLE_META) as AdminAppRole[];

/**
 * Première proposition de matrice, ajustable en revue de code (voir spec) — aucun accès réel n'en
 * dépend encore en V1, seule la page /admin/roles l'affiche.
 */
export const ROLE_PERMISSIONS: Record<AdminAppRole, PermissionModule[]> = {
  admin: [...ALL_MODULES],
  admin_content: ["content_catalog", "moderation"],
  admin_payments: ["payments", "analytics"],
  support: ["users", "analytics"],
  moderator: ["moderation"],
};

export function hasAppRole(role: string | null | undefined, expected: AppRole) {
  const roles = (role ?? "user").split(",").map((r) => r.trim());
  return roles.includes(expected);
}

/** True pour n'importe lequel des 5 rôles admin — remplace hasAppRole(role, "admin") partout où
 * la parité d'accès /admin doit s'appliquer à tous les rôles admin, pas seulement au Super Admin. */
export function isAdminRole(role: string | null | undefined): boolean {
  const roles = (role ?? "user").split(",").map((r) => r.trim());
  return roles.some((r) => (ADMIN_ROLES as string[]).includes(r));
}

/** Empêche un compte de se retirer lui-même tout accès admin depuis /admin/users. */
export function wouldSelfDemoteToUser(actingUserId: string, targetUserId: string, nextRole: AppRole): boolean {
  return actingUserId === targetUserId && nextRole === "user";
}

/** Empêche de faire disparaître le dernier compte Super Admin (contournement de paiement et 2FA
 * obligatoire "propriétaire" en dépendent — voir Review Focus de la spec). */
export function wouldRemoveLastSuperAdmin(
  remainingSuperAdminCount: number,
  targetCurrentRole: string | null | undefined,
  nextRole: AppRole,
): boolean {
  return targetCurrentRole === "admin" && nextRole !== "admin" && remainingSuperAdminCount <= 1;
}
```

- [ ] **Step 4: Lancer les tests, vérifier qu'ils passent**

Run: `npx vitest run tests/admin-roles-permissions.test.ts`
Expected: PASS (16 tests)

- [ ] **Step 5: Vérifier qu'aucun appelant existant n'est cassé**

Run: `npx tsc --noEmit`
Expected: 0 erreur (aucun appelant de `hasAppRole`/`AppRole` ne devrait être affecté — la signature de `hasAppRole` est inchangée, seul son type `AppRole` s'est élargi).

- [ ] **Step 6: Commit**

```bash
git add lib/auth/permissions.ts tests/admin-roles-permissions.test.ts
git commit -m "$(cat <<'EOF'
feat: modèle de rôles admin élargi (Super Admin, Contenu, Paiements, Support, Modérateur)

Ajoute les 5 rôles de la maquette Banani à AppRole, une matrice de
permissions par module définie dans le code (lue par /admin/roles, pas
encore appliquée aux accès réels), et les prédicats purs isAdminRole,
wouldSelfDemoteToUser et wouldRemoveLastSuperAdmin. Aucune migration :
la colonne user.role reste du texte libre.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Élargir la redirection post-connexion (`lib/auth/destination.ts`)

**Files:**
- Modify: `lib/auth/destination.ts`
- Test: `tests/auth-destination.test.ts` (existant, à étendre)

**Interfaces:**
- Consumes: `isAdminRole(role): boolean` (Task 1)
- Produces: `authenticatedDestination(role): "/admin" | "/dashboard"` (signature inchangée)

- [ ] **Step 1: Étendre le test existant (RED)**

Ajouter ce bloc dans `tests/auth-destination.test.ts`, après le premier `it` :

```ts
  it("envoie aussi les 4 nouveaux rôles admin vers le tableau de bord propriétaire (V1 sans cloisonnement)", () => {
    expect(authenticatedDestination("admin_content")).toBe("/admin");
    expect(authenticatedDestination("admin_payments")).toBe("/admin");
    expect(authenticatedDestination("support")).toBe("/admin");
    expect(authenticatedDestination("moderator")).toBe("/admin");
  });
```

- [ ] **Step 2: Lancer le test, vérifier qu'il échoue**

Run: `npx vitest run tests/auth-destination.test.ts`
Expected: FAIL — `authenticatedDestination("support")` retourne encore `/dashboard`.

- [ ] **Step 3: Implémenter**

Remplacer le contenu de `lib/auth/destination.ts` :

```ts
import { isAdminRole } from "@/lib/auth/permissions";

export function authenticatedDestination(role: string | null | undefined) {
  return isAdminRole(role) ? "/admin" : "/dashboard";
}
```

- [ ] **Step 4: Lancer le test, vérifier qu'il passe**

Run: `npx vitest run tests/auth-destination.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/auth/destination.ts tests/auth-destination.test.ts
git commit -m "$(cat <<'EOF'
feat: router les 5 rôles admin vers /admin après connexion

Utilise isAdminRole au lieu de hasAppRole(role, "admin") pour la
redirection post-connexion, pour la parité d'accès V1 des nouveaux
rôles admin.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Élargir `requireAdmin()` et la garde de l'API admin IA

**Files:**
- Modify: `lib/auth/session.ts:50-60` (fonction `requireAdmin`)
- Modify: `app/api/admin/ai/music-style-description/route.ts:27`

**Interfaces:**
- Consumes: `isAdminRole(role): boolean` (Task 1)
- Produces: aucun changement de signature — `requireAdmin()` continue de retourner la session ou de rediriger.

Ces deux points d'appel n'ont pas de test dédié aujourd'hui (Server Component / route API, non couverts par la suite Vitest de ce projet — seules les fonctions pures le sont). La vérification se fait par `tsc`/`eslint` puis par le contrôle manuel de Task 7.

- [ ] **Step 1: Modifier `lib/auth/session.ts`**

Dans l'import, remplacer :

```ts
import { hasAppRole } from "@/lib/auth/permissions";
```

par :

```ts
import { isAdminRole } from "@/lib/auth/permissions";
```

Puis dans `requireAdmin()`, remplacer :

```ts
  if (!hasAppRole(role, "admin")) redirect("/dashboard");
```

par :

```ts
  if (!isAdminRole(role)) redirect("/dashboard");
```

- [ ] **Step 2: Modifier `app/api/admin/ai/music-style-description/route.ts`**

Remplacer :

```ts
import { hasAppRole } from "@/lib/auth/permissions";
```

par :

```ts
import { isAdminRole } from "@/lib/auth/permissions";
```

Puis remplacer :

```ts
  if (!hasAppRole(role, "admin")) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
```

par :

```ts
  if (!isAdminRole(role)) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
```

- [ ] **Step 3: Vérifier**

Run: `npx tsc --noEmit && npx eslint lib/auth/session.ts app/api/admin/ai/music-style-description/route.ts`
Expected: 0 erreur.

Run: `npx vitest run`
Expected: tous les tests existants passent toujours (`tests/owner-two-factor.test.ts` inclus — cette suite n'est pas affectée, `owner-two-factor.ts` continue d'utiliser `hasAppRole(role, "admin")` sans changement).

- [ ] **Step 4: Commit**

```bash
git add lib/auth/session.ts app/api/admin/ai/music-style-description/route.ts
git commit -m "$(cat <<'EOF'
feat: élargir requireAdmin() et la garde API IA aux 5 rôles admin

Parité d'accès V1 : tout rôle admin (pas seulement Super Admin) garde
un accès complet à /admin et à cette API, comme avant l'introduction
des nouveaux rôles.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Étendre l'attribution de rôle (`app/admin/users/actions.ts`)

**Files:**
- Modify: `app/admin/users/actions.ts:1-31` (fonction `setRole` et `roleSchema`)

**Interfaces:**
- Consumes: `wouldSelfDemoteToUser`, `wouldRemoveLastSuperAdmin` (Task 1), `getServiceDb` (`@/db`), `user` (`@/db/schema`), `count`, `eq` (`drizzle-orm`)
- Produces: `setRole` accepte désormais `role` parmi les 6 valeurs (signature `AdminActionState` inchangée)

- [ ] **Step 1: Modifier les imports en tête de fichier**

Ajouter à `app/admin/users/actions.ts` (après les imports existants) :

```ts
import { count, eq } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { user } from "@/db/schema";
import { wouldRemoveLastSuperAdmin, wouldSelfDemoteToUser } from "@/lib/auth/permissions";
```

- [ ] **Step 2: Élargir `roleSchema` et réécrire `setRole`**

Remplacer les lignes 11-31 (de `const roleSchema = ...` à la fermeture de `setRole`) par :

```ts
const roleSchema = z.object({
  userId: z.string().min(1).max(120),
  role: z.enum(["user", "admin", "admin_content", "admin_payments", "support", "moderator"]),
});
export async function setRole(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    const adminSession = await requireAdmin();
    const parsed = roleSchema.parse(Object.fromEntries(formData));
    if (wouldSelfDemoteToUser(adminSession.user.id, parsed.userId, parsed.role))
      throw new Error("Vous ne pouvez pas retirer votre propre accès admin depuis cet écran.");
    const [target] = await getServiceDb()
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, parsed.userId))
      .limit(1);
    if (target?.role === "admin") {
      const [{ value: superAdminCount }] = await getServiceDb()
        .select({ value: count() })
        .from(user)
        .where(eq(user.role, "admin"));
      if (wouldRemoveLastSuperAdmin(Number(superAdminCount), target.role, parsed.role))
        throw new Error("Impossible de retirer le dernier compte Super Admin.");
    }
    await auth.api.setRole({ body: parsed, headers: await headers() });
    await writeAuditLog({
      action: "user.role.changed",
      actorId: adminSession.user.id,
      targetType: "user",
      targetId: parsed.userId,
      metadata: { role: parsed.role },
    });
    revalidatePath("/admin/users");
    revalidatePath("/admin/roles");
    return { ok: true, message: "Rôle de l'utilisateur mis à jour." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible de modifier le rôle de cet utilisateur.") };
  }
}
```

- [ ] **Step 3: Vérifier**

Run: `npx tsc --noEmit && npx eslint app/admin/users/actions.ts`
Expected: 0 erreur.

Run: `npx vitest run`
Expected: tous les tests passent (154+ tests, y compris les nouveaux de Task 1).

- [ ] **Step 4: Commit**

```bash
git add app/admin/users/actions.ts
git commit -m "$(cat <<'EOF'
feat: setRole accepte les 5 rôles admin, protège le dernier Super Admin

roleSchema passe de 2 à 6 valeurs. Le garde-fou anti-auto-verrouillage
se généralise : on ne peut plus se rétrograder soi-même vers "user",
mais on peut basculer son propre compte entre rôles admin. Nouveau
garde-fou : impossible de faire disparaître le dernier compte Super
Admin (dont dépendent le contournement de paiement et le 2FA
obligatoire propriétaire).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Élargir le sélecteur de rôle (`components/admin/AdminUsersTable.tsx`)

**Files:**
- Modify: `components/admin/AdminUsersTable.tsx:1-14`

**Interfaces:**
- Consumes: `ADMIN_ROLE_META`, `ADMIN_ROLES` (Task 1)
- Produces: `roleOptions` avec 6 entrées au lieu de 2 (même forme `{ value, label }[]` consommée par `AdminSelect`)

- [ ] **Step 1: Modifier les imports et `roleOptions`**

Ajouter l'import (après les imports existants) :

```ts
import { ADMIN_ROLES, ADMIN_ROLE_META } from "@/lib/auth/permissions";
```

Remplacer :

```ts
const roleOptions = [
  { value: "user", label: "Utilisateur" },
  { value: "admin", label: "Administrateur" },
] as const;
```

par :

```ts
const roleOptions = [
  { value: "user", label: "Utilisateur" },
  ...ADMIN_ROLES.map((role) => ({ value: role, label: ADMIN_ROLE_META[role].label })),
];
```

- [ ] **Step 2: Vérifier**

Run: `npx tsc --noEmit && npx eslint components/admin/AdminUsersTable.tsx`
Expected: 0 erreur. (`AdminSelect` accepte déjà un tableau `{value, label}[]` de taille arbitraire — utilisé ailleurs dans le projet avec des dizaines d'options, ex. la liste des pays.)

- [ ] **Step 3: Commit**

```bash
git add components/admin/AdminUsersTable.tsx
git commit -m "$(cat <<'EOF'
feat: proposer les 5 rôles admin dans le sélecteur de /admin/users

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Élargir le compteur « Administrateurs » (`app/admin/users/page.tsx`)

**Files:**
- Modify: `app/admin/users/page.tsx:14`

**Interfaces:**
- Consumes: `isAdminRole` (Task 1)

- [ ] **Step 1: Modifier**

Ajouter l'import :

```ts
import { isAdminRole } from "@/lib/auth/permissions";
```

Remplacer :

```ts
  const admins = users.filter((entry) => entry.role === "admin").length;
```

par :

```ts
  const admins = users.filter((entry) => isAdminRole(entry.role)).length;
```

- [ ] **Step 2: Vérifier**

Run: `npx tsc --noEmit && npx eslint app/admin/users/page.tsx`
Expected: 0 erreur.

- [ ] **Step 3: Commit**

```bash
git add app/admin/users/page.tsx
git commit -m "$(cat <<'EOF'
fix: compter les 5 rôles admin dans la métrique "Administrateurs"

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Réécrire `/admin/roles` (rôles dynamiques, équipe élargie, matrice de permissions)

**Files:**
- Modify: `app/admin/roles/page.tsx` (113 lignes actuelles, remplacées intégralement)

**Interfaces:**
- Consumes: `ADMIN_ROLE_META`, `ADMIN_ROLES`, `ALL_MODULES`, `MODULE_META`, `ROLE_PERMISSIONS` (Task 1)

- [ ] **Step 1: Remplacer le contenu du fichier**

```tsx
import { desc, inArray } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { user } from "@/db/schema";
import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import Icon from "@/components/banani/Icon";
import { requireAdmin } from "@/lib/auth/session";
import { getNameInitials } from "@/lib/profile/name-initials";
import {
  ADMIN_ROLES,
  ADMIN_ROLE_META,
  ALL_MODULES,
  MODULE_META,
  ROLE_PERMISSIONS,
  type AdminAppRole,
} from "@/lib/auth/permissions";

export default async function AdminRolesPage() {
  await requireAdmin();
  const db = getServiceDb();
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
    .where(inArray(user.role, ADMIN_ROLES))
    .orderBy(desc(user.createdAt));
  const roleLabel = (role: string | null) =>
    role && role in ADMIN_ROLE_META ? ADMIN_ROLE_META[role as AdminAppRole].label : "Rôle inconnu";
  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Sécurité"
        title="Rôles & accès"
        description="Consulte les rôles disponibles, l’équipe administratrice et la matrice de permissions."
      />
      <section className="admin-insight-grid">
        <article className="admin-panel">
          <div className="admin-panel-heading">
            <div>
              <span className="admin-panel-icon">
                <Icon i="shield-check" size={18} />
              </span>
              <div>
                <h2>Rôles disponibles</h2>
                <p>Modèle Better Auth actuel</p>
              </div>
            </div>
          </div>
          <div className="admin-role-list">
            {ADMIN_ROLES.map((role) => (
              <div key={role}>
                <span>
                  <Icon i={ADMIN_ROLE_META[role].icon} size={17} />
                </span>
                <div>
                  <strong>{ADMIN_ROLE_META[role].label}</strong>
                  <small>{ADMIN_ROLE_META[role].description}</small>
                </div>
              </div>
            ))}
            <div>
              <span>
                <Icon i="user" size={17} />
              </span>
              <div>
                <strong>Utilisateur</strong>
                <small>Accès à son espace personnel</small>
              </div>
            </div>
          </div>
        </article>
        <article className="admin-panel">
          <div className="admin-panel-heading">
            <div>
              <span className="admin-panel-icon">
                <Icon i="users" size={18} />
              </span>
              <div>
                <h2>Équipe administratrice</h2>
                <p>
                  {admins.length} compte{admins.length > 1 ? "s" : ""} admin
                </p>
              </div>
            </div>
          </div>
          {admins.length ? (
            <div className="admin-record-list">
              {admins.map((entry) => (
                <div className="admin-record" key={entry.id}>
                  <span className="admin-user-initial" aria-hidden="true">
                    {getNameInitials(entry.name)}
                  </span>
                  <div>
                    <strong>{entry.name}</strong>
                    <small>{entry.email}</small>
                  </div>
                  <div className="admin-record-value">
                    <strong>{roleLabel(entry.role)}</strong>
                    <span className={`admin-status ${entry.verified ? "is-success" : "is-pending"}`}>
                      {entry.verified ? "Vérifié" : "À vérifier"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="admin-empty-state">
              <Icon i="users" size={22} />
              <strong>Aucun administrateur</strong>
              <p>Aucun compte admin n’a été retourné.</p>
            </div>
          )}
        </article>
      </section>
      <article className="admin-panel admin-permission-matrix">
        <div className="admin-panel-heading">
          <div>
            <span className="admin-panel-icon">
              <Icon i="table" size={18} />
            </span>
            <div>
              <h2>Matrice de permissions</h2>
              <p>Vue en lecture seule, définie dans le code — pas encore appliquée aux accès réels.</p>
            </div>
          </div>
        </div>
        <div className="admin-data-table-wrap">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>Permission</th>
                {ADMIN_ROLES.map((role) => (
                  <th key={role}>{ADMIN_ROLE_META[role].label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ALL_MODULES.map((module) => (
                <tr key={module}>
                  <td>{MODULE_META[module].label}</td>
                  {ADMIN_ROLES.map((role) => (
                    <td key={role} style={{ textAlign: "center" }}>
                      {ROLE_PERMISSIONS[role].includes(module) ? (
                        <Icon i="check" size={16} />
                      ) : (
                        <span aria-hidden="true">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </AdminPage>
  );
}
```

- [ ] **Step 2: Vérifier par le typecheck et le lint**

Run: `npx tsc --noEmit && npx eslint app/admin/roles/page.tsx`
Expected: 0 erreur.

- [ ] **Step 3: Vérification visuelle manuelle (obligatoire pour tout changement d'UI — CLAUDE.md)**

Run: `npm run dev`, se connecter avec un compte `admin`, ouvrir `/admin/roles`.
Vérifier :
- Le panneau « Rôles disponibles » liste bien 5 rôles admin + « Utilisateur » (6 lignes), chacun avec une icône, un libellé et une description non vides.
- Le panneau « Équipe administratrice » affiche le compte admin courant avec le libellé « Super Admin » (pas « Administrateur »).
- La « Matrice de permissions » affiche 7 lignes (modules) × 5 colonnes (rôles), avec une coche exactement là où la table du plan/spec l'indique (ex. ligne « Modération », coche sur Admin Contenu et Modérateur uniquement).
- Aucun message « Source métier à connecter » ne subsiste sur cette page.

Ouvrir aussi `/admin/users` : le sélecteur de rôle de chaque ligne propose bien 6 options, et changer un rôle vers l'un des 4 nouveaux affiche un toast de succès puis le libellé mis à jour.

- [ ] **Step 4: Commit**

```bash
git add app/admin/roles/page.tsx
git commit -m "$(cat <<'EOF'
feat: rendre /admin/roles fidèle au design Banani (rôles, équipe, matrice)

"Rôles disponibles" et "Équipe administratrice" deviennent dynamiques
(au lieu du JSX statique à 2 entrées) et une nouvelle section "Matrice
de permissions" affiche ROLE_PERMISSIONS en lecture seule. La requête
équipe s'élargit aux 5 rôles admin. Source métier connectée.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Vérification finale du kit

**Files:** aucun (vérification uniquement)

- [ ] **Step 1: Suite complète**

Run: `npx tsc --noEmit`
Expected: 0 erreur.

- [ ] **Step 2: Lint ciblé**

Run: `npx eslint lib/auth/permissions.ts lib/auth/session.ts lib/auth/destination.ts app/api/admin/ai/music-style-description/route.ts app/admin/users/actions.ts app/admin/users/page.tsx app/admin/roles/page.tsx components/admin/AdminUsersTable.tsx`
Expected: 0 erreur.

- [ ] **Step 3: Tests**

Run: `npx vitest run`
Expected: tous les tests passent, y compris les 16 nouveaux de Task 1 et les 4 ajoutés en Task 2 (aucune régression sur `tests/owner-two-factor.test.ts` ni `tests/musikpro-demo.test.ts`, non touchés par ce plan).

- [ ] **Step 4: Gates du kit**

Run: `npm run kit:integrity`
Expected: `PASS`

Run: `npm run kit:audit`
Expected: `PASS — 100%`

- [ ] **Step 5: Rapport final**

Résumer au propriétaire (en français) : rôles disponibles, ce qui a changé sur `/admin/roles` et `/admin/users`, rappel explicite que l'accès `/admin` n'est pas encore cloisonné par rôle (chantier suivant), et que le 2FA obligatoire reste scopé au Super Admin comme décidé. Ne pas committer de commit supplémentaire à cette étape — les 7 commits des tâches précédentes suffisent ; demander au propriétaire s'il souhaite un commit local récapitulatif ou en rester là.

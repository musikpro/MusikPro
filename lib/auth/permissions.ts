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

/** True pour n'importe lequel des 5 rôles admin (ou un slug listé dans extraAdminSlugs, ex. un rôle
 * personnalisé "custom:<id>") — remplace hasAppRole(role, "admin") partout où la parité d'accès
 * /admin doit s'appliquer à tous les rôles admin, pas seulement au Super Admin. */
export function isAdminRole(role: string | null | undefined, extraAdminSlugs: string[] = []): boolean {
  const roles = (role ?? "user").split(",").map((r) => r.trim());
  return roles.some((r) => (ADMIN_ROLES as string[]).includes(r) || extraAdminSlugs.includes(r));
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

/** Un rôle personnalisé ne peut être supprimé que s'il n'a plus aucun membre assigné. */
export function canDeleteCustomRole(memberCount: number): boolean {
  return memberCount === 0;
}

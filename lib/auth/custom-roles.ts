import { cache } from "react";
import { getServiceDb } from "@/db";
import { customRoles } from "@/db/schema";
import { isAdminRole } from "@/lib/auth/permissions";

export async function listCustomRoles() {
  return getServiceDb().select().from(customRoles).orderBy(customRoles.name);
}

/** cache() dedupes this within a single request — requireAdmin() alone can run it once per
 * layout, page and action on the same /admin request. */
export const getActiveCustomRoleSlugs = cache(async (): Promise<string[]> => {
  const rows = await getServiceDb().select({ id: customRoles.id }).from(customRoles);
  return rows.map((row) => `custom:${row.id}`);
});

/**
 * Only queries custom_role when the role isn't already one of the 5 hardcoded system roles.
 * Most requests (every "user" account, every existing admin account) never touch this table at
 * all, so a migration/grant/connectivity issue on custom_role can't take down every /admin page
 * and every post-login redirect for accounts that have nothing to do with custom roles.
 */
export async function resolveExtraAdminSlugs(role: string | null | undefined): Promise<string[]> {
  return isAdminRole(role) ? [] : getActiveCustomRoleSlugs();
}

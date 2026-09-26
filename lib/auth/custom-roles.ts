import { getServiceDb } from "@/db";
import { customRoles } from "@/db/schema";

export async function listCustomRoles() {
  return getServiceDb().select().from(customRoles).orderBy(customRoles.name);
}

export async function getActiveCustomRoleSlugs(): Promise<string[]> {
  const rows = await getServiceDb().select({ id: customRoles.id }).from(customRoles);
  return rows.map((row) => `custom:${row.id}`);
}

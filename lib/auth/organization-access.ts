import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { member } from "@/db/schema";
import { hasOrganizationRole, type OrganizationRole } from "@/lib/auth/permissions";

export type OrganizationAccess = {
  organizationId: string;
  userId: string;
  role: OrganizationRole;
};

export async function getOrganizationAccess(
  userId: string,
  organizationId: string,
): Promise<OrganizationAccess | null> {
  const [membership] = await db
    .select({ organizationId: member.organizationId, userId: member.userId, role: member.role })
    .from(member)
    .where(and(eq(member.organizationId, organizationId), eq(member.userId, userId)))
    .limit(1);

  if (!membership || !hasOrganizationRole(membership.role, ["owner", "admin", "member"])) return null;
  return {
    organizationId: membership.organizationId,
    userId: membership.userId,
    role: membership.role as OrganizationRole,
  };
}

export async function requireOrganizationAccess(
  userId: string,
  organizationId: string,
  allowedRoles: readonly OrganizationRole[] = ["owner", "admin", "member"],
): Promise<OrganizationAccess> {
  const access = await getOrganizationAccess(userId, organizationId);
  if (!access || !hasOrganizationRole(access.role, allowedRoles)) {
    throw new Error("Organization access denied");
  }
  return access;
}

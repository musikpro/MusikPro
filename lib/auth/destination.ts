import { isAdminRole } from "@/lib/auth/permissions";

export function authenticatedDestination(role: string | null | undefined, extraAdminSlugs: string[] = []) {
  return isAdminRole(role, extraAdminSlugs) ? "/admin" : "/dashboard";
}

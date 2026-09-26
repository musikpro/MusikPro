import { isAdminRole } from "@/lib/auth/permissions";

export function authenticatedDestination(role: string | null | undefined) {
  return isAdminRole(role) ? "/admin" : "/dashboard";
}

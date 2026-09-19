import { hasAppRole } from "@/lib/auth/permissions";

export function authenticatedDestination(role: string | null | undefined) {
  return hasAppRole(role, "admin") ? "/admin" : "/dashboard";
}

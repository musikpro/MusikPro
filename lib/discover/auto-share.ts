import { isAdminRole } from "@/lib/auth/permissions";

/** Un compte « administrateur » : un des rôles système d'administration ou un rôle personnalisé (`custom:<id>`). */
export function isAdminAccountRole(role: string | null | undefined): boolean {
  if (isAdminRole(role)) return true;
  return (role ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .some((entry) => entry.startsWith("custom:"));
}

/** Une chanson générée est placée d'office dans Découvrir si son créateur est administrateur et que le réglage est actif. */
export function shouldAutoShareSong(input: { role: string | null | undefined; enabled: boolean }): boolean {
  return input.enabled && isAdminAccountRole(input.role);
}

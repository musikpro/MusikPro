export type AppRole = "user" | "admin";

export function hasAppRole(role: string | null | undefined, expected: AppRole) {
  const roles = (role ?? "user").split(",").map((r) => r.trim());
  return roles.includes(expected);
}

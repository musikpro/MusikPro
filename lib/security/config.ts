export type SecurityLevel = "standard" | "high" | "maximum";

export function getSecurityLevel(): SecurityLevel {
  const value = process.env.SECURITY_LEVEL ?? "high";
  if (value === "standard" || value === "high" || value === "maximum") return value;
  return "high";
}

export const securityPolicy = {
  standard: { authPerMinute: 10, apiPerMinute: 120, requireAdmin2FA: false },
  high: { authPerMinute: 6, apiPerMinute: 60, requireAdmin2FA: true },
  maximum: { authPerMinute: 4, apiPerMinute: 30, requireAdmin2FA: true },
} as const;

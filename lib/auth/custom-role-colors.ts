export const CUSTOM_ROLE_COLORS = ["orange", "bleu", "vert", "violet", "rouge", "gris"] as const;
export type CustomRoleColor = (typeof CUSTOM_ROLE_COLORS)[number];
export const CUSTOM_ROLE_COLOR_HEX: Record<CustomRoleColor, string> = {
  orange: "#F26522",
  bleu: "#277EFF",
  vert: "#22C55E",
  violet: "#8B5CF6",
  rouge: "#EF4444",
  gris: "#6B7280",
};

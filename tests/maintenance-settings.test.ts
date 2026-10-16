import { describe, expect, it } from "vitest";
import { MAINTENANCE_MESSAGE_MAX, maintenanceFormSchema } from "@/lib/validation/maintenance";

const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
};

describe("maintenanceFormSchema", () => {
  it("accepte une activation avec un message", () => {
    const parsed = maintenanceFormSchema.safeParse({ enable: "true", message: "  Retour à 14 h.  " });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data).toEqual({ enable: true, message: "Retour à 14 h." });
  });

  it("accepte la désactivation sans message", () => {
    const parsed = maintenanceFormSchema.safeParse({ enable: "false", message: "" });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data).toEqual({ enable: false, message: null });
  });

  it("refuse un message trop long", () => {
    const parsed = maintenanceFormSchema.safeParse({
      enable: "true",
      message: "x".repeat(MAINTENANCE_MESSAGE_MAX + 1),
    });
    expect(parsed.success).toBe(false);
  });

  it("refuse une valeur d'interrupteur inconnue", () => {
    expect(maintenanceFormSchema.safeParse({ enable: "peut-être", message: "" }).success).toBe(false);
    expect(maintenanceFormSchema.safeParse({ message: "" }).success).toBe(false);
  });

  it("lit un FormData (champs absents = vides)", () => {
    const data = form({ enable: "true" });
    const parsed = maintenanceFormSchema.safeParse(Object.fromEntries(data));
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.message).toBeNull();
  });
});

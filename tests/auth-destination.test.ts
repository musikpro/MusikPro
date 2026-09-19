import { describe, expect, it } from "vitest";
import { authenticatedDestination } from "@/lib/auth/destination";

describe("authenticatedDestination", () => {
  it("envoie un administrateur vers le tableau de bord propriétaire", () => {
    expect(authenticatedDestination("admin")).toBe("/admin");
    expect(authenticatedDestination("user,admin")).toBe("/admin");
  });

  it("conserve les comptes clients sur leur tableau de bord", () => {
    expect(authenticatedDestination("user")).toBe("/dashboard");
    expect(authenticatedDestination(undefined)).toBe("/dashboard");
  });
});

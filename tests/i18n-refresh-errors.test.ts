import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { describeRefreshError } from "@/lib/i18n/refresh-errors";

describe("describeRefreshError", () => {
  it("explique l'absence de fournisseur IA", () => {
    expect(describeRefreshError(new Error("AI_PROVIDER_NOT_CONFIGURED"), 0)).toContain("Aucun fournisseur IA");
  });
  it("explique la limite de débit", () => {
    expect(describeRefreshError(new Error("RATE_LIMITED"), 0)).toContain("Trop d’actualisations");
  });
  it("ajoute le nombre de textes déjà enregistrés", () => {
    const message = describeRefreshError(new Error("boom"), 12);
    expect(message).toContain("boom");
    expect(message).toContain("12 textes déjà enregistrés");
  });
  it("reste générique pour une valeur inconnue sans progrès", () => {
    expect(describeRefreshError("x", 0)).toBe("La mise à jour des traductions a échoué.");
  });
});

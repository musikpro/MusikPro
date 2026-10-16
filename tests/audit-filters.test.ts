import { describe, expect, it } from "vitest";
import { parseAuditFilters, auditFiltersToSearchParams } from "@/lib/validation/audit-filters";

describe("parseAuditFilters", () => {
  it("accepte des filtres valides et applique la page 1 par défaut", () => {
    const result = parseAuditFilters({
      actor: " marie ",
      action: "user.role.changed",
      from: "2026-10-01",
      to: "2026-10-15",
    });
    expect(result.error).toBeNull();
    expect(result.filters).toEqual({
      actor: "marie",
      action: "user.role.changed",
      from: "2026-10-01",
      to: "2026-10-15",
      page: 1,
    });
  });

  it("traite les champs vides du formulaire comme absents", () => {
    const result = parseAuditFilters({ actor: "", action: "", from: "", to: "", page: "" });
    expect(result.error).toBeNull();
    expect(result.filters).toEqual({ page: 1 });
  });

  it("prend la première valeur quand un paramètre est répété", () => {
    expect(parseAuditFilters({ actor: ["a", "b"] }).filters.actor).toBe("a");
  });

  it("refuse une date impossible", () => {
    expect(parseAuditFilters({ from: "2026-02-31" }).error).not.toBeNull();
    expect(parseAuditFilters({ from: "demain" }).error).not.toBeNull();
  });

  it("refuse une période inversée", () => {
    expect(parseAuditFilters({ from: "2026-10-15", to: "2026-10-01" }).error).toMatch(/période/i);
  });

  it("refuse une action avec des caractères interdits", () => {
    expect(parseAuditFilters({ action: "user'; drop table" }).error).not.toBeNull();
  });

  it("refuse une page négative ou non numérique, et retombe sur des filtres vides", () => {
    for (const page of ["-1", "0", "abc"]) {
      const result = parseAuditFilters({ page });
      expect(result.error).not.toBeNull();
      expect(result.filters).toEqual({ page: 1 });
    }
  });

  it("borne la longueur de la recherche d'acteur", () => {
    expect(parseAuditFilters({ actor: "x".repeat(200) }).error).not.toBeNull();
  });
});

describe("auditFiltersToSearchParams", () => {
  it("ne garde que les filtres renseignés et n'ajoute la page que si elle dépasse 1", () => {
    expect(auditFiltersToSearchParams({ actor: "marie", page: 1 }).toString()).toBe("actor=marie");
    expect(auditFiltersToSearchParams({ action: "plan.deleted", page: 3 }, { withPage: true }).toString()).toBe(
      "action=plan.deleted&page=3",
    );
  });
});

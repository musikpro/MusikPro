import { describe, expect, it } from "vitest";
import { resolveAdminTab } from "@/lib/admin/tabs";

const tabs = [
  { id: "blocks", label: "Blocs intégrés" },
  { id: "fields", label: "Champs" },
];

describe("resolveAdminTab", () => {
  it("retient l'onglet de l'URL quand il existe (retour depuis un champ → « Champs »)", () => {
    expect(resolveAdminTab("fields", tabs)).toBe("fields");
    expect(resolveAdminTab(["fields", "blocks"], tabs)).toBe("fields");
  });
  it("ignore une valeur absente ou inconnue (onglet par défaut)", () => {
    expect(resolveAdminTab(undefined, tabs)).toBeUndefined();
    expect(resolveAdminTab("nimporte", tabs)).toBeUndefined();
    expect(resolveAdminTab("__proto__", tabs)).toBeUndefined();
  });
});

import { describe, expect, it } from "vitest";
import {
  ADMIN_ROLES,
  ADMIN_ROLE_META,
  ALL_MODULES,
  ROLE_PERMISSIONS,
  isAdminRole,
  wouldSelfDemoteToUser,
  wouldRemoveLastSuperAdmin,
} from "@/lib/auth/permissions";

describe("isAdminRole", () => {
  it("reconnaît chacun des 5 rôles admin", () => {
    for (const role of ADMIN_ROLES) {
      expect(isAdminRole(role)).toBe(true);
    }
  });

  it("rejette le rôle user, une valeur vide et une valeur inconnue", () => {
    expect(isAdminRole("user")).toBe(false);
    expect(isAdminRole(null)).toBe(false);
    expect(isAdminRole(undefined)).toBe(false);
    expect(isAdminRole("stagiaire")).toBe(false);
  });

  it("reconnaît un rôle admin combiné en CSV (héritage Better Auth)", () => {
    expect(isAdminRole("user,support")).toBe(true);
  });
});

describe("ROLE_PERMISSIONS", () => {
  it("couvre exactement les mêmes clés que ADMIN_ROLES", () => {
    expect(Object.keys(ROLE_PERMISSIONS).sort()).toEqual([...ADMIN_ROLES].sort());
  });

  it("donne au Super Admin l'accès à tous les modules définis", () => {
    expect(ROLE_PERMISSIONS.admin.sort()).toEqual([...ALL_MODULES].sort());
  });

  it("ne référence que des modules existants pour chaque rôle", () => {
    for (const role of ADMIN_ROLES) {
      for (const module of ROLE_PERMISSIONS[role]) {
        expect(ALL_MODULES).toContain(module);
      }
    }
  });
});

describe("ADMIN_ROLE_META", () => {
  it("a un libellé, une description et une icône pour chaque rôle admin", () => {
    for (const role of ADMIN_ROLES) {
      expect(ADMIN_ROLE_META[role].label).toBeTruthy();
      expect(ADMIN_ROLE_META[role].description).toBeTruthy();
      expect(ADMIN_ROLE_META[role].icon).toBeTruthy();
    }
  });
});

describe("wouldSelfDemoteToUser", () => {
  it("bloque un compte qui tente de se rétrograder lui-même vers user", () => {
    expect(wouldSelfDemoteToUser("u1", "u1", "user")).toBe(true);
  });

  it("autorise un compte à changer son propre rôle vers un autre rôle admin", () => {
    expect(wouldSelfDemoteToUser("u1", "u1", "support")).toBe(false);
  });

  it("n'affecte pas le changement de rôle d'un autre compte", () => {
    expect(wouldSelfDemoteToUser("u1", "u2", "user")).toBe(false);
  });
});

describe("wouldRemoveLastSuperAdmin", () => {
  it("bloque quand c'est le dernier Super Admin et qu'il change de rôle", () => {
    expect(wouldRemoveLastSuperAdmin(1, "admin", "support")).toBe(true);
  });

  it("autorise quand il reste d'autres Super Admin", () => {
    expect(wouldRemoveLastSuperAdmin(2, "admin", "support")).toBe(false);
  });

  it("autorise quand la cible n'était pas Super Admin", () => {
    expect(wouldRemoveLastSuperAdmin(1, "support", "moderator")).toBe(false);
  });

  it("autorise quand le nouveau rôle reste admin", () => {
    expect(wouldRemoveLastSuperAdmin(1, "admin", "admin")).toBe(false);
  });
});

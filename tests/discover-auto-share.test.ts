import { describe, expect, it } from "vitest";
import { isAdminAccountRole, shouldAutoShareSong } from "@/lib/discover/auto-share";
import { songDiscoverSchema, songJobIdSchema } from "@/lib/validation/song-title";

describe("ajout automatique des chansons d'administrateurs à Découvrir", () => {
  it("reconnaît les rôles d'administration, personnalisés compris", () => {
    expect(isAdminAccountRole("admin")).toBe(true);
    expect(isAdminAccountRole("custom:abc123")).toBe(true);
    expect(isAdminAccountRole("user,custom:abc123")).toBe(true);
    expect(isAdminAccountRole("user")).toBe(false);
    expect(isAdminAccountRole(null)).toBe(false);
    expect(isAdminAccountRole(undefined)).toBe(false);
  });

  it("n'ajoute une chanson que pour un administrateur quand le réglage est actif", () => {
    expect(shouldAutoShareSong({ role: "admin", enabled: true })).toBe(true);
    expect(shouldAutoShareSong({ role: "admin", enabled: false })).toBe(false);
    expect(shouldAutoShareSong({ role: "user", enabled: true })).toBe(false);
    expect(shouldAutoShareSong({ role: null, enabled: true })).toBe(false);
  });
});

describe("validation des actions Générations", () => {
  it("accepte un identifiant de version borné", () => {
    expect(songJobIdSchema.parse({ jobId: " abc " })).toEqual({ jobId: "abc" });
    expect(() => songJobIdSchema.parse({ jobId: "" })).toThrow();
    expect(() => songJobIdSchema.parse({ jobId: "x".repeat(121) })).toThrow();
  });

  it("n'accepte que visible = true ou false pour Découvrir", () => {
    expect(songDiscoverSchema.parse({ songGroupId: "g1", visible: "true" }).visible).toBe("true");
    expect(() => songDiscoverSchema.parse({ songGroupId: "g1", visible: "yes" })).toThrow();
    expect(() => songDiscoverSchema.parse({ songGroupId: "", visible: "false" })).toThrow();
  });
});

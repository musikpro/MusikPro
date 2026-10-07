import { describe, expect, it } from "vitest";
import { registerAppReleaseSchema, releaseIdSchema } from "@/lib/validation/app-releases";

const base = { pathname: "app-releases/android/android-AbC123.apk", version: "1.2", build: "5" };

describe("registerAppReleaseSchema", () => {
  it("accepte une version valide et convertit le build en nombre", () => {
    const parsed = registerAppReleaseSchema.parse({ ...base, notes: "  Correctifs  " });
    expect(parsed).toEqual({ ...base, build: 5, notes: "Correctifs" });
  });

  it("transforme des notes vides en null", () => {
    expect(registerAppReleaseSchema.parse({ ...base, notes: "   " }).notes).toBeNull();
    expect(registerAppReleaseSchema.parse(base).notes).toBeNull();
  });

  it("refuse un chemin hors du dossier, avec traversée ou sans extension .apk", () => {
    for (const pathname of [
      "autre/android.apk",
      "app-releases/android/../secret.apk",
      "app-releases/android/x.exe",
      "app-releases/android/",
      "https://evil.example/app.apk",
      "app-releases/android/a b.apk",
    ]) {
      expect(registerAppReleaseSchema.safeParse({ ...base, pathname }).success).toBe(false);
    }
  });

  it("refuse une version ou un build invalides et les champs inconnus", () => {
    for (const patch of [
      { version: "1" },
      { version: "v1.2" },
      { version: "1.2.3.4" },
      { build: "0" },
      { build: "abc" },
      { build: "1.5" },
    ]) {
      expect(registerAppReleaseSchema.safeParse({ ...base, ...patch }).success).toBe(false);
    }
    expect(registerAppReleaseSchema.safeParse({ ...base, extra: 1 }).success).toBe(false);
  });
});

describe("releaseIdSchema", () => {
  it("n'accepte qu'un identifiant court", () => {
    expect(releaseIdSchema.safeParse({ id: "abc" }).success).toBe(true);
    expect(releaseIdSchema.safeParse({ id: "" }).success).toBe(false);
    expect(releaseIdSchema.safeParse({ id: "x".repeat(65) }).success).toBe(false);
  });
});

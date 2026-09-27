import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";

describe("AmbientPlayerProvider — moteur audio unique sur la page d'accueil", () => {
  it("est rendu exactement une fois dans app/dashboard/page.tsx", async () => {
    const source = await fs.readFile("app/dashboard/page.tsx", "utf8");
    const occurrences = source.split("<AmbientPlayerProvider").length - 1;
    expect(occurrences).toBe(1);
  });

  it("n'est jamais instancié à l'intérieur de UserDashboardMobile ou UserDashboardDesktop", async () => {
    const mobile = await fs.readFile("components/banani/UserDashboardMobile.tsx", "utf8");
    const desktop = await fs.readFile("components/banani/UserDashboardDesktop.tsx", "utf8");
    expect(mobile).not.toContain("AmbientPlayerProvider");
    expect(mobile).not.toContain("AmbientPlayerContext");
    expect(desktop).not.toContain("AmbientPlayerProvider");
    expect(desktop).not.toContain("AmbientPlayerContext");
  });

  it("le bouton de contrôle est présent dans la barre du haut mobile et desktop", async () => {
    const mobile = await fs.readFile("components/banani/UserDashboardMobile.tsx", "utf8");
    const desktop = await fs.readFile("components/banani/UserDashboardDesktop.tsx", "utf8");
    expect(mobile).toContain("<AmbientPlayerButton");
    expect(desktop).toContain("<AmbientPlayerButton");
  });
});

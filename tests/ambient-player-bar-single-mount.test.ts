import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";

describe("AmbientPlayerBar — montage unique sur la page d'accueil", () => {
  it("est rendu exactement une fois dans app/dashboard/page.tsx", async () => {
    const source = await fs.readFile("app/dashboard/page.tsx", "utf8");
    const occurrences = source.split("<AmbientPlayerBar").length - 1;
    expect(occurrences).toBe(1);
  });

  it("n'est jamais rendu à l'intérieur de UserDashboardMobile ou UserDashboardDesktop", async () => {
    const mobile = await fs.readFile("components/banani/UserDashboardMobile.tsx", "utf8");
    const desktop = await fs.readFile("components/banani/UserDashboardDesktop.tsx", "utf8");
    expect(mobile).not.toContain("AmbientPlayerBar");
    expect(desktop).not.toContain("AmbientPlayerBar");
  });
});

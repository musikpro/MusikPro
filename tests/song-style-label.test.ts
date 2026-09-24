import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";

// lib/ai/songs.ts imports "server-only" (unresolvable outside Next.js) and transitively "@/db"
// (requires DATABASE_URL at import time), so — like the rest of this repo's Musicful tests —
// this exercises the extraction regex directly (copied from the source, asserted verbatim
// below) rather than importing the module.
function extractGenreLabel(style: string | null): string | null {
  if (!style) return style;
  const match = style.match(/^(.*?)(?: \(| — )/);
  return (match ? match[1] : style).trim();
}

describe("Song card style label (no AI-prompt leakage)", () => {
  it("keeps a bare genre name unchanged", () => {
    expect(extractGenreLabel("Afrobeat")).toBe("Afrobeat");
  });

  it("strips the strict-adherence AI directive in parentheses", () => {
    const style =
      "Zouglou (Générez un Zouglou avec un tempo entre 110 et 130 BPM, fondé sur des rythmes syncopés...). Respecte fidèlement les codes rythmiques, instrumentaux et vocaux authentiques de ce style musical précis, sans dériver vers un genre plus générique. — Ambiance : Énergique";
    expect(extractGenreLabel(style)).toBe("Zouglou");
  });

  it("strips the non-strict '— description' form", () => {
    expect(extractGenreLabel("Gospel — Chorale puissante, orgue, claps sur le 2 et 4")).toBe("Gospel");
  });

  it("strips a mood suffix even with no style description", () => {
    expect(extractGenreLabel("Amapiano — Ambiance : Festive")).toBe("Amapiano");
  });

  it("passes through null", () => {
    expect(extractGenreLabel(null)).toBeNull();
  });

  it("matches the exact implementation in lib/ai/songs.ts", async () => {
    const source = await fs.readFile("lib/ai/songs.ts", "utf8");
    expect(source).toContain("function extractGenreLabel(style: string | null): string | null {");
    expect(source).toContain("style.match(/^(.*?)(?: \\(| — )/)");
    expect(source).toContain("style: extractGenreLabel(first.style),");
  });
});

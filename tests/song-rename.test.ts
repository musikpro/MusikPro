import { describe, expect, it } from "vitest";
import { renamedVersionTitles } from "@/lib/ai/song-title";
import { renameSongSchema, songTitleSchema } from "@/lib/validation/song-title";

describe("renamedVersionTitles", () => {
  it("garde le suffixe de chaque version, lu dans son libellé", () => {
    expect(
      renamedVersionTitles("Mon plus beau jour", [
        { id: "a", versionLabel: "Version 1" },
        { id: "b", versionLabel: "Version 2" },
      ]),
    ).toEqual([
      { id: "a", title: "Mon plus beau jour — Version 1" },
      { id: "b", title: "Mon plus beau jour — Version 2" },
    ]);
  });

  it("retombe sur le rang quand le libellé manque et retire un suffixe saisi par erreur", () => {
    expect(renamedVersionTitles("Titre — Version 9", [{ id: "a", versionLabel: null }])).toEqual([
      { id: "a", title: "Titre — Version 1" },
    ]);
  });
});

describe("songTitleSchema", () => {
  it("accepte un titre normal avec accents et ponctuation", () => {
    expect(songTitleSchema.parse("  Aïcha, l’amour d’une vie  ")).toBe("Aïcha, l’amour d’une vie");
  });

  it("refuse les balises, les titres trop courts ou trop longs", () => {
    expect(songTitleSchema.safeParse("<b>Titre</b>").success).toBe(false);
    expect(songTitleSchema.safeParse("A").success).toBe(false);
    // Le suffixe de version est ignoré : il ne reste alors qu'un caractère, donc refusé.
    expect(songTitleSchema.safeParse("A — Version 2").success).toBe(false);
    expect(songTitleSchema.safeParse("x".repeat(121)).success).toBe(false);
  });

  it("accepte un titre qui contient un suffixe de version (il sera retiré au stockage)", () => {
    expect(songTitleSchema.safeParse("Titre — Version 2").success).toBe(true);
  });

  it("exige un identifiant de génération", () => {
    expect(renameSongSchema.safeParse({ jobId: "", title: "Titre valide" }).success).toBe(false);
    expect(renameSongSchema.safeParse({ jobId: "job-1", title: "Titre valide" }).success).toBe(true);
  });
});

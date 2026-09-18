import { describe, expect, it } from "vitest";
import { matchesSongSearch } from "../lib/demo/search";
import { demoSongPacks } from "../lib/demo/musikpro-data";
describe("Recherche MusikPro", () => {
  it("ignore les accents et la casse", () =>
    expect(matchesSongSearch(" GLOIRE a toi ", "Gloire à Toi", "Gospel")).toBe(
      true,
    ));
  it("combine les mots entre titre, style et occasion", () =>
    expect(
      matchesSongSearch(
        "amapiano mariage",
        "Mon mariage",
        "Amapiano",
        "Mariage",
      ),
    ).toBe(true));
  it("refuse un mot absent", () =>
    expect(
      matchesSongSearch("afrobeat mariage", "Mon mariage", "Amapiano"),
    ).toBe(false));
  it("affiche tous les titres quand la recherche est effacée", () =>
    expect(matchesSongSearch("", "Mama Africa")).toBe(true));
  it("respecte les quantités et prix demandés", () => {
    expect(demoSongPacks[0].songs).toBe(2);
    expect(demoSongPacks[1].songs).toBe(5);
    expect(demoSongPacks[1].priceValue).toBe(2000);
  });
});

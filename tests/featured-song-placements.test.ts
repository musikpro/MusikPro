import { describe, expect, it } from "vitest";
import {
  hiddenSongLabel,
  mergeSongPlacements,
  placementsWithout,
  songAlreadyUsedMessage,
  TRENDING_PLACEMENT_LABEL,
} from "@/lib/featured-songs/placements";

const landing = [
  { songGroupId: "song-a", label: "Ils ont créé avec MusikPro" },
  { songGroupId: "song-b", label: "Bibliothèque populaire" },
];

describe("mergeSongPlacements", () => {
  it("indique la section qui utilise chaque chanson, landing et Tendances confondues", () => {
    expect(mergeSongPlacements(landing, ["song-c"])).toEqual({
      "song-a": "Ils ont créé avec MusikPro",
      "song-b": "Bibliothèque populaire",
      "song-c": TRENDING_PLACEMENT_LABEL,
    });
  });

  it("cite la landing en premier quand une même chanson figure aussi dans Tendances (données plus anciennes)", () => {
    expect(mergeSongPlacements(landing, ["song-a"])["song-a"]).toBe("Ils ont créé avec MusikPro");
  });

  it("renvoie un objet vide sans aucune chanson mise en avant", () => {
    expect(mergeSongPlacements([], [])).toEqual({});
  });
});

describe("placementsWithout", () => {
  it("laisse la chanson de la carte modifiée sélectionnable", () => {
    const placements = mergeSongPlacements(landing, ["song-c"]);
    expect(placementsWithout(placements, ["song-a"])).toEqual({
      "song-b": "Bibliothèque populaire",
      "song-c": TRENDING_PLACEMENT_LABEL,
    });
  });

  it("ignore les identifiants absents ou indéfinis", () => {
    const placements = mergeSongPlacements(landing, []);
    expect(placementsWithout(placements, [undefined, "inconnue"])).toEqual(placements);
  });
});

describe("songAlreadyUsedMessage", () => {
  it("nomme la section qui utilise déjà la chanson", () => {
    expect(songAlreadyUsedMessage("Tendances")).toContain("« Tendances »");
  });
});

describe("hiddenSongLabel", () => {
  it("distingue deux chansons de même titre par un fragment d'identifiant", () => {
    const first = hiddenSongLabel({ songGroupId: "4c9adc34-475f", title: "Ma chanson — Amour" }, "Tendances");
    const second = hiddenSongLabel({ songGroupId: "6ba1c0bf-d9e1", title: "Ma chanson — Amour" }, "Tendances");
    expect(first).toBe("Ma chanson — Amour #4c9adc (Tendances)");
    expect(second).not.toBe(first);
  });
});

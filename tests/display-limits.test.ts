import { describe, expect, it } from "vitest";
import {
  MUSIC_STYLES_MAX_COUNT_MAX,
  MUSIC_STYLES_MAX_COUNT_MIN,
  TITLE_MAX_CHARS_DEFAULT,
  TITLE_MAX_CHARS_MAX,
  TITLE_MAX_CHARS_MIN,
  normalizeMusicStylesMaxCount,
  normalizeTitleMaxChars,
  truncateTitle,
} from "@/lib/settings/display-limits-constants";

describe("truncateTitle", () => {
  it("laisse intact un titre qui tient dans la limite", () => {
    expect(truncateTitle("Aïcha — Amour", 40)).toBe("Aïcha — Amour");
  });

  it("coupe au nombre de caractères et ajoute « … »", () => {
    expect(truncateTitle("Aïcha — Amour — Afrobeats / Naija Pop — octobre 2026 — Version 2", 20)).toBe(
      "Aïcha — Amour — Afro…",
    );
  });

  it("compte les caractères Unicode et non les unités UTF-16", () => {
    expect(truncateTitle("🎵🎵🎵🎵🎵🎵", 3)).toBe("🎵🎵🎵…");
  });

  it("retire l'espace final avant « … »", () => {
    expect(truncateTitle("Mariam — Amour", 7)).toBe("Mariam…");
  });
});

describe("normalisation des limites", () => {
  it("ramène les titres dans les bornes ou à la valeur par défaut", () => {
    expect(normalizeTitleMaxChars(1)).toBe(TITLE_MAX_CHARS_MIN);
    expect(normalizeTitleMaxChars(9999)).toBe(TITLE_MAX_CHARS_MAX);
    expect(normalizeTitleMaxChars("abc")).toBe(TITLE_MAX_CHARS_DEFAULT);
    expect(normalizeTitleMaxChars(35)).toBe(35);
  });

  it("ramène le nombre de styles dans les bornes", () => {
    expect(normalizeMusicStylesMaxCount(0)).toBe(MUSIC_STYLES_MAX_COUNT_MIN);
    expect(normalizeMusicStylesMaxCount(500)).toBe(MUSIC_STYLES_MAX_COUNT_MAX);
    expect(normalizeMusicStylesMaxCount(12)).toBe(12);
  });
});

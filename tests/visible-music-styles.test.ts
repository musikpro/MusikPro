import { describe, expect, it } from "vitest";
import {
  VISIBLE_MUSIC_STYLES_DEFAULT,
  VISIBLE_MUSIC_STYLES_MAX,
  VISIBLE_MUSIC_STYLES_MIN,
  normalizeVisibleMusicStyles,
  splitVisibleStyles,
} from "@/lib/music-styles/visible";

const styles = Array.from({ length: 20 }, (_, index) => ({ name: `Style ${index + 1}` }));

describe("normalizeVisibleMusicStyles", () => {
  it("garde une valeur valide et arrondit", () => {
    expect(normalizeVisibleMusicStyles(6)).toBe(6);
    expect(normalizeVisibleMusicStyles("10")).toBe(10);
    expect(normalizeVisibleMusicStyles(7.6)).toBe(8);
  });

  it("borne les valeurs extrêmes", () => {
    expect(normalizeVisibleMusicStyles(0)).toBe(VISIBLE_MUSIC_STYLES_MIN);
    expect(normalizeVisibleMusicStyles(999)).toBe(VISIBLE_MUSIC_STYLES_MAX);
  });

  it("retombe sur 9 pour une valeur invalide", () => {
    expect(VISIBLE_MUSIC_STYLES_DEFAULT).toBe(9);
    expect(normalizeVisibleMusicStyles("abc")).toBe(9);
    expect(normalizeVisibleMusicStyles(undefined)).toBe(9);
    expect(normalizeVisibleMusicStyles(Number.NaN)).toBe(9);
  });
});

describe("splitVisibleStyles", () => {
  it("montre les 9 premiers et range le reste", () => {
    const result = splitVisibleStyles(styles, 9, "");
    expect(result.initial).toHaveLength(9);
    expect(result.more).toHaveLength(11);
    expect(result.startsExpanded).toBe(false);
  });

  it("ne coupe rien quand il y a moins de styles que le seuil", () => {
    const result = splitVisibleStyles(styles.slice(0, 5), 9, "");
    expect(result.initial).toHaveLength(5);
    expect(result.more).toHaveLength(0);
    expect(result.startsExpanded).toBe(false);
  });

  it("démarre déplié si le style choisi est caché", () => {
    expect(splitVisibleStyles(styles, 9, "Style 15").startsExpanded).toBe(true);
    expect(splitVisibleStyles(styles, 9, "Style 9").startsExpanded).toBe(false);
  });

  it("suit le réglage (6 ou 10)", () => {
    expect(splitVisibleStyles(styles, 6, "").initial).toHaveLength(6);
    expect(splitVisibleStyles(styles, 10, "").initial).toHaveLength(10);
  });
});

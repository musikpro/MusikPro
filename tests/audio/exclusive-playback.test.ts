import { describe, expect, it } from "vitest";
import { isAmbientAudio, mediaToPause } from "@/lib/audio/exclusive-playback";

type FakeMedia = { id: string; paused: boolean; getAttribute: (name: string) => string | null };

const media = (id: string, paused: boolean, role: string | null = null): FakeMedia => ({
  id,
  paused,
  getAttribute: (name) => (name === "data-audio-role" ? role : null),
});

describe("lecture exclusive des chansons", () => {
  it("met en pause toutes les autres chansons en cours de lecture", () => {
    const started = media("a", false);
    const playing = media("b", false);
    const idle = media("c", true);
    expect(mediaToPause(started, [started, playing, idle])).toEqual([playing]);
  });

  it("ne touche jamais l'élément qui vient de démarrer", () => {
    const started = media("a", false);
    expect(mediaToPause(started, [started])).toEqual([]);
  });

  it("laisse la musique d'ambiance gérer elle-même sa baisse de volume", () => {
    const ambient = media("amb", false, "ambient");
    const started = media("song", false);
    expect(isAmbientAudio(ambient)).toBe(true);
    expect(mediaToPause(started, [started, ambient])).toEqual([]);
  });

  it("ne coupe aucune chanson quand c'est la musique d'ambiance qui démarre", () => {
    const ambient = media("amb", false, "ambient");
    const song = media("song", false);
    expect(mediaToPause(ambient, [ambient, song])).toEqual([]);
  });

  it("accepte un élément sans attribut lisible", () => {
    expect(isAmbientAudio({ paused: false })).toBe(false);
  });
});

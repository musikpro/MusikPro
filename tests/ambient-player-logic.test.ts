import { describe, expect, it } from "vitest";
import {
  AMBIENT_MUTE_STORAGE_KEY,
  shouldShowAmbientBar,
  readStoredMutePreference,
  writeStoredMutePreference,
  resolveAutoplayOutcome,
} from "@/lib/demo/ambient-player-logic";

describe("shouldShowAmbientBar", () => {
  it("cache la bande si désactivé", () => {
    expect(shouldShowAmbientBar({ enabled: false, audioUrl: "https://example.com/a.mp3" })).toBe(false);
  });

  it("cache la bande si aucune URL audio", () => {
    expect(shouldShowAmbientBar({ enabled: true, audioUrl: null })).toBe(false);
  });

  it("affiche la bande si activé avec une URL", () => {
    expect(shouldShowAmbientBar({ enabled: true, audioUrl: "https://example.com/a.mp3" })).toBe(true);
  });
});

function fakeStorage(initial: Record<string, string> = {}) {
  const store = { ...initial };
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    dump: () => store,
  };
}

describe("readStoredMutePreference / writeStoredMutePreference", () => {
  it("lit false par défaut quand rien n'est stocké", () => {
    expect(readStoredMutePreference(fakeStorage())).toBe(false);
  });

  it("lit true quand la préférence a été écrite", () => {
    const storage = fakeStorage({ [AMBIENT_MUTE_STORAGE_KEY]: "1" });
    expect(readStoredMutePreference(storage)).toBe(true);
  });

  it("écrit puis relit la préférence muette", () => {
    const storage = fakeStorage();
    writeStoredMutePreference(storage, true);
    expect(storage.dump()[AMBIENT_MUTE_STORAGE_KEY]).toBe("1");
    expect(readStoredMutePreference(storage)).toBe(true);
  });

  it("écrit puis relit la préférence non muette", () => {
    const storage = fakeStorage({ [AMBIENT_MUTE_STORAGE_KEY]: "1" });
    writeStoredMutePreference(storage, false);
    expect(readStoredMutePreference(storage)).toBe(false);
  });
});

describe("resolveAutoplayOutcome", () => {
  it("reste muet si le navigateur a refusé l'autoplay avec son, même sans préférence stockée", () => {
    expect(resolveAutoplayOutcome(false, false)).toBe(true);
  });

  it("respecte la préférence muette de l'utilisateur même si l'autoplay avec son a réussi", () => {
    expect(resolveAutoplayOutcome(true, true)).toBe(true);
  });

  it("reste non muet si l'autoplay a réussi et qu'aucune préférence muette n'est stockée", () => {
    expect(resolveAutoplayOutcome(true, false)).toBe(false);
  });

  it("reste muet si l'autoplay a échoué et que l'utilisateur avait déjà choisi le son coupé", () => {
    expect(resolveAutoplayOutcome(false, true)).toBe(true);
  });
});

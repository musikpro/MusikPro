import { describe, expect, it } from "vitest";
import {
  AMBIENT_MUTE_STORAGE_KEY,
  shouldShowAmbientBar,
  readStoredMutePreference,
  writeStoredMutePreference,
  resolveAutoplayOutcome,
  isFatalAudioError,
  ambientGain,
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

describe("isFatalAudioError", () => {
  it("ignore une erreur d'abandon (MEDIA_ERR_ABORTED, code 1) — provoquée par un simple pause()/démontage, pas un fichier cassé", () => {
    expect(isFatalAudioError(1)).toBe(false);
  });

  it("traite une erreur réseau (MEDIA_ERR_NETWORK, code 2) comme fatale", () => {
    expect(isFatalAudioError(2)).toBe(true);
  });

  it("traite une erreur de décodage (MEDIA_ERR_DECODE, code 3) comme fatale", () => {
    expect(isFatalAudioError(3)).toBe(true);
  });

  it("traite une source non supportée (MEDIA_ERR_SRC_NOT_SUPPORTED, code 4) comme fatale", () => {
    expect(isFatalAudioError(4)).toBe(true);
  });

  it("traite l'absence de code d'erreur comme fatale (par prudence)", () => {
    expect(isFatalAudioError(null)).toBe(true);
    expect(isFatalAudioError(undefined)).toBe(true);
  });
});

describe("ambientGain — courbe de volume perceptuelle", () => {
  it("garde le même gain qu'avant au maximum (50 % → 0,5)", () => {
    expect(ambientGain(50)).toBeCloseTo(0.5, 5);
  });

  it("baisse plus vite que linéaire : 5 % est bien plus discret que 0,05", () => {
    expect(ambientGain(5)).toBeLessThan(0.01);
    expect(ambientGain(5)).toBeLessThan(5 / 100);
  });

  it("est croissant et borné entre 1 % et 50 %", () => {
    expect(ambientGain(1)).toBeGreaterThan(0);
    expect(ambientGain(10)).toBeGreaterThan(ambientGain(5));
    expect(ambientGain(0)).toBe(ambientGain(1));
    expect(ambientGain(100)).toBe(ambientGain(50));
  });
});

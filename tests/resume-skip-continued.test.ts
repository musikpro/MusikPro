import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearResumeContinued,
  clearResumeSkip,
  consumeResumeContinued,
  markResumeContinued,
  markResumeSkip,
} from "@/lib/creation-draft/resume-skip";

function stubStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal("sessionStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  });
  vi.stubGlobal("document", { cookie: "" });
  return store;
}

describe("choix « Continuer ma chanson » mémorisé pour le Retour du système", () => {
  let store: Map<string, string>;
  beforeEach(() => {
    store = stubStorage();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("is consumed exactly once", () => {
    markResumeContinued(1_000);
    expect(consumeResumeContinued(2_000)).toBe(true);
    expect(consumeResumeContinued(2_000)).toBe(false);
    expect(store.size).toBe(0);
  });

  it("is false when the user never chose « Continuer » (the resume screen shows as before)", () => {
    expect(consumeResumeContinued()).toBe(false);
  });

  it("expires after two hours and ignores a corrupted or future value", () => {
    markResumeContinued(1_000);
    expect(consumeResumeContinued(1_000 + 2 * 60 * 60 * 1000 + 1)).toBe(false);
    store.set("musikpro_resume_continued", "abc");
    expect(consumeResumeContinued()).toBe(false);
    markResumeContinued(5_000);
    expect(consumeResumeContinued(1_000)).toBe(false);
  });

  it("does not survive a voluntary exit (Retour / Tableau de bord) nor a normal entry on step 1", () => {
    markResumeContinued(1_000);
    markResumeSkip();
    expect(consumeResumeContinued(2_000)).toBe(false);
    markResumeContinued(1_000);
    clearResumeSkip();
    expect(consumeResumeContinued(2_000)).toBe(false);
    markResumeContinued(1_000);
    clearResumeContinued();
    expect(consumeResumeContinued(2_000)).toBe(false);
  });

  it("never throws when the storage is unavailable (private browsing)", () => {
    vi.stubGlobal("sessionStorage", {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
      removeItem: () => {
        throw new Error("denied");
      },
    });
    expect(() => markResumeContinued()).not.toThrow();
    expect(consumeResumeContinued()).toBe(false);
    expect(() => clearResumeContinued()).not.toThrow();
  });
});

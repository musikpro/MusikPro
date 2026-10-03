import { afterEach, describe, expect, it, vi } from "vitest";
import { apiFetch, ApiClientError } from "@/lib/api/client";
import { markI18nReady, resetI18nReadyForTests, resetOverlayForTests, setOverlay } from "@/lib/i18n/overlay";

afterEach(() => {
  vi.unstubAllGlobals();
  resetI18nReadyForTests();
  resetOverlayForTests();
});

function errorResponse() {
  return new Response(JSON.stringify({ error: "Chanson introuvable." }), { status: 404 });
}

describe("apiFetch — langue des messages d'erreur", () => {
  function setup(pathname: string) {
    vi.stubGlobal("document", { documentElement: { lang: "en" } });
    vi.stubGlobal("window", { location: { pathname } });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(errorResponse()));
    setOverlay("en", { "Chanson introuvable.": "Song not found." });
    markI18nReady();
  }

  it("traduit le message serveur dans le tableau de bord", async () => {
    setup("/en/dashboard/songs");
    await expect(apiFetch("https://example.test/api")).rejects.toMatchObject({ message: "Song not found." });
  });

  it("garde le message français sous /admin, même si <html lang> est resté en anglais", async () => {
    for (const pathname of ["/admin/trending", "/en/admin/media"]) {
      setup(pathname);
      const error = await apiFetch("https://example.test/api").catch((caught: unknown) => caught);
      expect(error).toBeInstanceOf(ApiClientError);
      expect((error as ApiClientError).message).toBe("Chanson introuvable.");
    }
  });
});

describe("apiFetch", () => {
  it("retries a GET network failure once", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("network"))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(apiFetch<{ ok: boolean }>("https://example.test/api")).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("never retries POST after an ambiguous network error", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("network"));
    vi.stubGlobal("fetch", fetchMock);
    await expect(apiFetch("https://example.test/api", { method: "POST", body: "{}" })).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/api/client";

afterEach(() => vi.unstubAllGlobals());

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

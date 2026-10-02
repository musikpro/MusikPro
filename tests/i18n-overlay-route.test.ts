import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const loadOverlay = vi.hoisted(() => vi.fn(async () => ({ "Texte inédit": "Brand new text" })));
vi.mock("@/lib/i18n/overlay-server", () => ({ loadOverlay }));

import { GET } from "@/app/api/i18n/overlay/route";

const call = (query: string) => GET(new Request(`http://localhost/api/i18n/overlay${query}`));

describe("GET /api/i18n/overlay", () => {
  it("returns the dictionary of a valid locale, publicly cacheable", async () => {
    const response = await call("?locale=en");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ "Texte inédit": "Brand new text" });
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=0, must-revalidate");
    expect(loadOverlay).toHaveBeenCalledWith("en");
  });

  it.each(["", "?locale=fr", "?locale=de", "?locale=__proto__"])("rejects %s with 400 and no cache", async (query) => {
    const response = await call(query);
    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});

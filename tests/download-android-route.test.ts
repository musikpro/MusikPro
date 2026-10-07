import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const state = vi.hoisted(() => ({
  limit: { success: true, backend: "memory" } as { success: boolean; backend: string },
  opened: null as null | {
    release: { id: string; fileName: string; sha256: string };
    stream: ReadableStream;
    size: number;
  },
}));
const countDownload = vi.hoisted(() => vi.fn());

vi.mock("@/lib/security/rate-limit", () => ({ clientIp: () => "1.2.3.4", rateLimit: async () => state.limit }));
vi.mock("@/lib/app-releases/server", () => ({ openPublishedRelease: async () => state.opened, countDownload }));

import { GET, HEAD } from "@/app/download/android/route";

const request = () => new Request("https://musikpro.net/download/android");
const stream = () => new ReadableStream({ start: (c) => (c.enqueue(new Uint8Array([1, 2, 3])), c.close()) });

describe("GET /download/android", () => {
  beforeEach(() => {
    state.limit = { success: true, backend: "memory" };
    state.opened = { release: { id: "r1", fileName: "MusikPro-1.2.apk", sha256: "abc" }, stream: stream(), size: 3 };
    countDownload.mockReset();
  });

  it("sert l'APK en pièce jointe avec les en-têtes de sécurité et compte le téléchargement", async () => {
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/vnd.android.package-archive");
    expect(response.headers.get("Content-Disposition")).toBe('attachment; filename="MusikPro-1.2.apk"');
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(response.headers.get("X-Checksum-Sha256")).toBe("abc");
    expect(countDownload).toHaveBeenCalledWith("r1");
  });

  it("répond 404 sans version publiée", async () => {
    state.opened = null;
    expect((await GET(request())).status).toBe(404);
  });

  it("limite le débit (429) et échoue fermé si le contrôle est indisponible (503)", async () => {
    state.limit = { success: false, backend: "memory" };
    expect((await GET(request())).status).toBe(429);
    state.limit = { success: false, backend: "unavailable" };
    expect((await GET(request())).status).toBe(503);
  });

  it("HEAD renvoie les en-têtes sans corps ni comptage", async () => {
    const response = await HEAD(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Length")).toBe("3");
    expect(countDownload).not.toHaveBeenCalled();
  });
});

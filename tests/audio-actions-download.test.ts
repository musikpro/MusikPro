import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadAudioFile } from "@/lib/demo/audio-actions";

type FakeLink = {
  href: string;
  download?: string;
  rel?: string;
  click: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
};

/** Environnement navigateur minimal : le projet teste en `node`, on simule seulement ce que le helper touche. */
function stubBrowser(platform?: string) {
  const links: FakeLink[] = [];
  vi.stubGlobal("document", {
    createElement: () => {
      const link: FakeLink = { href: "", click: vi.fn(), remove: vi.fn() };
      links.push(link);
      return link;
    },
    body: { appendChild: vi.fn() },
  });
  vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: vi.fn(() => "blob:fake"), revokeObjectURL: vi.fn() }));
  if (platform) vi.stubGlobal("Capacitor", { getPlatform: () => platform });
  return links;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("downloadAudioFile", () => {
  it("keeps the blob download on the web (unchanged behaviour)", async () => {
    const links = stubBrowser();
    const fetchMock = vi.fn(
      async () => new Response("MP3", { status: 200, headers: { "content-type": "audio/mpeg" } }),
    );
    vi.stubGlobal("fetch", fetchMock);
    expect(await downloadAudioFile("https://files.musicful.ai/a.mp3", 'Ma chanson — "A"')).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith("https://files.musicful.ai/a.mp3");
    expect(links).toHaveLength(1);
    expect(links[0].href).toBe("blob:fake");
    expect(links[0].download).toBe("Ma chanson — _A_.mp3");
    expect(links[0].click).toHaveBeenCalledOnce();
  });

  it("keeps the blob download in Safari on iPhone (only the Capacitor app uses the share sheet)", async () => {
    const links = stubBrowser();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("MP3", { headers: { "content-type": "audio/mpeg" } })),
    );
    expect(await downloadAudioFile("https://files.musicful.ai/a.mp3", "Titre")).toBe(true);
    expect(links[0].href).toBe("blob:fake");
  });

  it("on the iPhone app, reads the file through the same-origin route and opens the share sheet", async () => {
    const links = stubBrowser("ios");
    const fetchMock = vi.fn(
      async () => new Response("MP3", { status: 200, headers: { "content-type": "audio/mpeg" } }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const share = vi.fn(async () => undefined);
    vi.stubGlobal("navigator", { canShare: () => true, share });
    expect(await downloadAudioFile("https://files.musicful.ai/a.mp3", "Ma chanson — A")).toBe(true);
    const [target, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(target.startsWith("/api/songs/download?")).toBe(true);
    expect(init).toMatchObject({ credentials: "same-origin" });
    const shared = (share.mock.calls[0] as unknown as [{ files: File[]; title: string }])[0];
    expect(shared.files[0].name).toBe("Ma chanson — A.mp3");
    expect(shared.files[0].type).toBe("audio/mpeg");
    expect(links).toHaveLength(0);
  });

  it("on the iPhone app, a closed share sheet is not a failure but a refused file is", async () => {
    stubBrowser("ios");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("MP3", { headers: { "content-type": "audio/mpeg" } })),
    );
    vi.stubGlobal("navigator", {
      canShare: () => true,
      share: vi.fn(async () => {
        throw new DOMException("closed", "AbortError");
      }),
    });
    expect(await downloadAudioFile("https://files.musicful.ai/a.mp3", "Titre")).toBe(true);
    vi.stubGlobal("navigator", { canShare: () => false, share: vi.fn() });
    expect(await downloadAudioFile("https://files.musicful.ai/a.mp3", "Titre")).toBe(false);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 404 })),
    );
    vi.stubGlobal("navigator", { canShare: () => true, share: vi.fn() });
    expect(await downloadAudioFile("https://files.musicful.ai/a.mp3", "Titre")).toBe(false);
  });

  it("on the Android app, checks access then navigates to the same-origin attachment route", async () => {
    const links = stubBrowser("android");
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await downloadAudioFile("https://files.musicful.ai/a.mp3", "Ma chanson — A")).toBe(true);
    const [target, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(target.startsWith("/api/songs/download?")).toBe(true);
    expect(new URLSearchParams(target.split("?")[1]).get("url")).toBe("https://files.musicful.ai/a.mp3");
    expect(new URLSearchParams(target.split("?")[1]).get("name")).toBe("Ma chanson — A");
    expect(init).toMatchObject({ method: "HEAD", credentials: "same-origin" });
    expect(links[0].href).toBe(target);
    expect(links[0].click).toHaveBeenCalledOnce();
  });

  it("on the Android app, never navigates away when the server refuses (the JSON error must not replace the page)", async () => {
    const links = stubBrowser("android");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ error: "x" }), { status: 404 })),
    );
    expect(await downloadAudioFile("https://files.musicful.ai/a.mp3", "Titre")).toBe(false);
    expect(links).toHaveLength(0);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.reject(new TypeError("network"))),
    );
    expect(await downloadAudioFile("https://files.musicful.ai/a.mp3", "Titre")).toBe(false);
    expect(links).toHaveLength(0);
  });
});

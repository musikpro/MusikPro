import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.hoisted(() => vi.fn());
const rateLimit = vi.hoisted(() => vi.fn());
const findOwnedCompletedAudio = vi.hoisted(() => vi.fn());
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession } } }));
vi.mock("@/lib/security/rate-limit", () => ({ rateLimit, clientIp: () => "127.0.0.1" }));
vi.mock("@/lib/ai/song-download", () => ({ findOwnedCompletedAudio }));

import { GET, HEAD } from "@/app/api/songs/download/route";

const AUDIO = "https://files.musicful.ai/aimusic/api/abc/abc.mp3";
const request = (params: Record<string, string>, method = "GET") =>
  new Request(`https://musikpro.net/api/songs/download?${new URLSearchParams(params)}`, { method });

const stubUpstream = (response: Response | Error) => {
  const fetchMock = vi.fn(async () => {
    if (response instanceof Error) throw response;
    return response;
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

describe("GET/HEAD /api/songs/download", () => {
  beforeEach(() => {
    getSession.mockResolvedValue({ user: { id: "user-1" } });
    rateLimit.mockResolvedValue({ success: true, backend: "redis" });
    findOwnedCompletedAudio.mockResolvedValue({ title: "Ma chanson — Version A" });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  it("streams the user's own song as an attachment named after the title", async () => {
    const upstream = stubUpstream(
      new Response("MP3DATA", { status: 200, headers: { "content-type": "audio/mpeg", "content-length": "7" } }),
    );
    const response = await GET(request({ url: AUDIO }));
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("MP3DATA");
    expect(response.headers.get("content-type")).toBe("audio/mpeg");
    expect(response.headers.get("content-disposition")).toContain("attachment;");
    expect(response.headers.get("content-disposition")).toContain("Ma%20chanson%20%E2%80%94%20Version%20A.mp3");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(findOwnedCompletedAudio).toHaveBeenCalledWith("user-1", AUDIO);
    // requête sortante : l'URL lue en base, sans suivre de redirection ni transmettre de cookies.
    expect(upstream).toHaveBeenCalledWith(AUDIO, expect.objectContaining({ redirect: "error", cache: "no-store" }));
  });

  it("uses the requested name when provided, sanitised", async () => {
    stubUpstream(new Response("x", { headers: { "content-type": "audio/mpeg" } }));
    const response = await GET(request({ url: AUDIO, name: "../Titre" }));
    expect(response.headers.get("content-disposition")).toContain('filename="_Titre.mp3"');
  });

  it("names an mp4-audio file .m4a and never trusts a non-audio content type", async () => {
    stubUpstream(new Response("x", { headers: { "content-type": "video/mp4" } }));
    expect((await GET(request({ url: AUDIO }))).headers.get("content-disposition")).toContain(".m4a");
    stubUpstream(new Response("<html>", { headers: { "content-type": "text/html" } }));
    const html = await GET(request({ url: AUDIO }));
    expect(html.headers.get("content-type")).toBe("audio/mpeg");
  });

  it("rejects a visitor without session before anything else", async () => {
    getSession.mockResolvedValue(null);
    const upstream = stubUpstream(new Response("x"));
    const response = await GET(request({ url: AUDIO }));
    expect(response.status).toBe(401);
    expect(findOwnedCompletedAudio).not.toHaveBeenCalled();
    expect(upstream).not.toHaveBeenCalled();
  });

  it("rejects missing, non-https and oversized urls (400) without any outgoing request", async () => {
    const upstream = stubUpstream(new Response("x"));
    const invalid: Record<string, string>[] = [
      {},
      { url: "http://files.musicful.ai/a.mp3" },
      { url: "ftp://files.musicful.ai/a.mp3" },
      { url: "not a url" },
      { url: `https://files.musicful.ai/${"a".repeat(2100)}` },
    ];
    for (const params of invalid) {
      expect((await GET(request(params))).status).toBe(400);
    }
    expect(upstream).not.toHaveBeenCalled();
    expect(findOwnedCompletedAudio).not.toHaveBeenCalled();
  });

  it("is not an open proxy: an url that is not one of the user's songs is a 404 and is never fetched", async () => {
    findOwnedCompletedAudio.mockResolvedValue(null);
    const upstream = stubUpstream(new Response("x"));
    for (const url of ["https://evil.example/a.mp3", "https://169.254.169.254/latest/meta-data/", "https://localhost/a.mp3"]) {
      expect((await GET(request({ url }))).status).toBe(404);
    }
    expect(upstream).not.toHaveBeenCalled();
  });

  it("applies the rate limit (429) and fails closed when the limiter is unavailable (503)", async () => {
    rateLimit.mockResolvedValue({ success: false, backend: "redis" });
    expect((await GET(request({ url: AUDIO }))).status).toBe(429);
    rateLimit.mockResolvedValue({ success: false, backend: "unavailable" });
    expect((await GET(request({ url: AUDIO }))).status).toBe(503);
    expect(rateLimit).toHaveBeenCalledWith("songs:download:user-1:127.0.0.1", 20);
  });

  it("answers 502 without leaking details when the source fails, errors or is too large", async () => {
    stubUpstream(new Response("boom", { status: 500 }));
    expect((await GET(request({ url: AUDIO }))).status).toBe(502);
    stubUpstream(new Error("connect ECONNREFUSED 10.0.0.1:443"));
    const failed = await GET(request({ url: AUDIO }));
    expect(failed.status).toBe(502);
    expect(JSON.stringify(await failed.json())).not.toContain("10.0.0.1");
    stubUpstream(new Response("x", { headers: { "content-length": String(200 * 1024 * 1024) } }));
    expect((await GET(request({ url: AUDIO }))).status).toBe(502);
  });

  it("HEAD only checks access: 200 for an owned song, no outgoing request, no body", async () => {
    const upstream = stubUpstream(new Response("x"));
    const ok = await HEAD(request({ url: AUDIO }, "HEAD"));
    expect(ok.status).toBe(200);
    expect(await ok.text()).toBe("");
    findOwnedCompletedAudio.mockResolvedValue(null);
    expect((await HEAD(request({ url: AUDIO }, "HEAD"))).status).toBe(404);
    getSession.mockResolvedValue(null);
    expect((await HEAD(request({ url: AUDIO }, "HEAD"))).status).toBe(401);
    expect(upstream).not.toHaveBeenCalled();
  });
});

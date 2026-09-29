import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { musicGptAudioAdapter } from "@/lib/ai/audio-providers/musicgpt";

const config = {
  apiKey: "k",
  baseUrl: "https://api.musicgpt.com/api/public",
  model: "v7",
  timeoutMs: 5000,
  maxRetries: 0,
};

function mockFetch(body: unknown, status = 200) {
  const fn = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe("MusicGPT adapter", () => {
  it("envoie une génération V2 et renvoie les deux variantes", async () => {
    const fn = mockFetch({ success: true, task_id: "t", conversion_id_1: "c1", conversion_id_2: "c2" });
    const result = await musicGptAudioAdapter.submit(
      { title: "T", lyrics: "la la", style: "Zouglou", instrumental: false, gender: "male", versionCount: 1 },
      config,
    );
    expect(result.taskIds).toEqual(["c1", "c2"]);
    const [url, init] = fn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.musicgpt.com/api/public/v2/MusicAI");
    expect(JSON.parse(String(init.body))).toMatchObject({ model: "v7", make_instrumental: false, gender: "male" });
  });

  it("lit le MP3 de la bonne variante et jamais le WAV", async () => {
    const conversion = {
      status: "IN_PROGRESS",
      conversion_id_1: "c1",
      conversion_id_2: "c2",
      conversion_path_1: "https://x/1.mp3",
      conversion_path_wav_1: "https://x/1.wav",
      conversion_duration_1: 163.84,
      title_1: "T1",
      album_cover_path: "https://x/cover.jpg",
    };
    mockFetch({ success: true, conversion });
    const one = await musicGptAudioAdapter.getTask("c1", config);
    expect(one).toMatchObject({
      state: "completed",
      audioUrl: "https://x/1.mp3",
      durationSeconds: 164,
      title: "T1",
      coverUrl: "https://x/cover.jpg",
    });
    mockFetch({ success: true, conversion });
    expect((await musicGptAudioAdapter.getTask("c2", config)).state).toBe("processing");
  });

  it("interroge byId avec conversionType=MUSIC_AI", async () => {
    const fn = mockFetch({ conversion: { status: "IN_PROGRESS" } });
    await musicGptAudioAdapter.getTask("c1", config);
    expect(String((fn.mock.calls[0] as unknown[])[0])).toContain("conversionType=MUSIC_AI");
  });

  it("reste en cours sans MP3 et échoue sur un statut d'erreur", async () => {
    mockFetch({ status: "IN_QUEUE" });
    expect((await musicGptAudioAdapter.getTask("c1", config)).state).toBe("processing");
    mockFetch({ status: "FAILED", message: "nope" });
    expect((await musicGptAudioAdapter.getTask("c1", config)).state).toBe("failed");
  });
});

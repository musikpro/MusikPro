import { describe, expect, it, vi } from "vitest";
import { shareAudioFile, shareLink } from "@/lib/demo/audio-actions";

describe("shareLink / shareAudioFile", () => {
  it("shareAudioFile still shares the exact same text as before the refactor", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { share });
    const result = await shareAudioFile("https://cdn.example/song.mp3", "Ma chanson");
    expect(result).toBe("shared");
    expect(share).toHaveBeenCalledWith({
      title: "Ma chanson",
      text: "Écoute cette chanson créée sur MusikPro !",
      url: "https://cdn.example/song.mp3",
    });
    vi.unstubAllGlobals();
  });

  it("shareLink shares a public page link with the text the caller provides", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { share });
    const result = await shareLink("https://app.example/s/abc", "Ma chanson", "Écoute ma chanson sur MusikPro !");
    expect(result).toBe("shared");
    expect(share).toHaveBeenCalledWith({
      title: "Ma chanson",
      text: "Écoute ma chanson sur MusikPro !",
      url: "https://app.example/s/abc",
    });
    vi.unstubAllGlobals();
  });

  it("falls back to clipboard copy when the Web Share API is unavailable", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const result = await shareLink("https://app.example/s/abc", "Titre", "texte");
    expect(result).toBe("copied");
    expect(writeText).toHaveBeenCalledWith("https://app.example/s/abc");
    vi.unstubAllGlobals();
  });
});

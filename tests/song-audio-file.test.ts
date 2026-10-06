import { describe, expect, it } from "vitest";
import { attachmentDisposition, extensionForContentType, sanitizeDownloadName } from "@/lib/songs/audio-file";

describe("extensionForContentType", () => {
  it("keeps the extension honest about the real content type (unchanged behaviour)", () => {
    expect(extensionForContentType("audio/mpeg")).toBe("mp3");
    expect(extensionForContentType("video/mp4")).toBe("m4a");
    expect(extensionForContentType("audio/wav")).toBe("wav");
    expect(extensionForContentType("audio/ogg")).toBe("ogg");
    expect(extensionForContentType("")).toBe("mp3");
  });
});

describe("sanitizeDownloadName", () => {
  it("keeps a normal song title, accents and dash included", () => {
    expect(sanitizeDownloadName("Ma chanson — Version A")).toBe("Ma chanson — Version A");
  });

  it("neutralises path separators and header-breaking characters", () => {
    expect(sanitizeDownloadName("../../etc/passwd")).toBe("_.._etc_passwd");
    expect(sanitizeDownloadName('a"b\r\nSet-Cookie: x')).not.toMatch(/["\r\n]/);
    expect(sanitizeDownloadName("a<b>c|d?e*f:g")).toBe("a_b_c_d_e_f_g");
  });

  it("falls back to a default name and bounds the length", () => {
    expect(sanitizeDownloadName("")).toBe("chanson");
    expect(sanitizeDownloadName(null)).toBe("chanson");
    expect(sanitizeDownloadName("   ...   ")).toBe("chanson");
    expect(sanitizeDownloadName("x".repeat(500)).length).toBe(120);
  });
});

describe("attachmentDisposition", () => {
  it("is an attachment with an ASCII fallback and the exact UTF-8 name", () => {
    const header = attachmentDisposition("Café — Awa", "mp3");
    expect(header.startsWith("attachment; ")).toBe(true);
    expect(header).toContain('filename="Cafe _ Awa.mp3"');
    expect(header).toContain("filename*=UTF-8''Caf%C3%A9%20%E2%80%94%20Awa.mp3");
  });

  it("never lets a quote or a line break through", () => {
    const header = attachmentDisposition('x"; filename="evil', "mp3");
    expect(header.split("\n")).toHaveLength(1);
    expect(header.match(/filename="/g)).toHaveLength(1);
  });
});

import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";

describe("Public song page /s/[slug]", () => {
  it("never renders a distinguishable result for missing vs. unpublished (calls notFound() whenever getPublicSongBySlug returns null)", async () => {
    const source = await fs.readFile("app/s/[slug]/page.tsx", "utf8");
    expect(source).toContain("const song = await getPublicSongBySlug(slug);");
    expect(source).toContain("if (!song) notFound();");
  });

  it("uses buildMetadata for Open Graph previews (social sharing)", async () => {
    const source = await fs.readFile("app/s/[slug]/page.tsx", "utf8");
    expect(source).toContain("buildMetadata({");
    expect(source).toContain("image: song.coverUrl ?? undefined,");
  });

  it("never exposes a download control to anonymous listeners", async () => {
    const source = await fs.readFile("app/s/[slug]/PublicSongPlayer.tsx", "utf8");
    expect(source).toContain('controlsList="nodownload"');
    // Checks for a standalone `download` HTML attribute (a leading space, as in `<a download>`
    // or `<audio download>`) — not present here since "nodownload" above has no space before it.
    expect(source).not.toContain(" download");
    expect(source).not.toContain("<a ");
  });

  it("has a dedicated not-found page instead of the raw Next.js 404", async () => {
    const source = await fs.readFile("app/s/[slug]/not-found.tsx", "utf8");
    expect(source).toContain("Chanson indisponible");
  });

  it("resolves the visitor's locale from the request and wraps fixed UI strings for translation", async () => {
    const pageSource = await fs.readFile("app/s/[slug]/page.tsx", "utf8");
    expect(pageSource).toContain("resolvePageLocale");
    expect(pageSource).toContain("t(");
    expect(pageSource).toContain("translateTemplate(");
    // song.title (user-generated content) must never be passed through t()/translateTemplate().
    expect(pageSource).not.toContain("t(song.title)");
    expect(pageSource).not.toContain("translateTemplate(song.title");

    const notFoundSource = await fs.readFile("app/s/[slug]/not-found.tsx", "utf8");
    expect(notFoundSource).toContain("resolvePageLocale");
    expect(notFoundSource).toContain("t(");
  });

  it("scans app/s for i18n:sync so these keys actually get synced", async () => {
    const source = await fs.readFile("scripts/i18n-sync.mts", "utf8");
    expect(source).toContain("app/s");
  });
});

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
});

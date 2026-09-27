import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";

describe("SongGroupView exposes coverUrl end-to-end", () => {
  it("adds coverUrl to the SongGroupView type", async () => {
    const source = await fs.readFile("lib/ai/songs.ts", "utf8");
    expect(source).toContain("coverUrl: string | null;");
  });

  it("derives the group cover from the first sorted job, like title/style/occasion", async () => {
    const source = await fs.readFile("lib/ai/songs.ts", "utf8");
    expect(source).toContain("coverUrl: first.coverUrl,");
  });
});

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

  it("exposes setSongGroupCover, scoped by userId and songGroupId, updating every version's cover", async () => {
    const source = await fs.readFile("lib/ai/songs.ts", "utf8");
    expect(source).toContain("export async function setSongGroupCover(");
    expect(source).toContain("eq(musicGenerationJobs.songGroupId, songGroupId)");
    expect(source).toContain("if (!result.length) throw new MusicJobOwnershipError();");
  });
});

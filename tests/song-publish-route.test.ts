import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";

describe("POST /api/songs/[groupId]/publish", () => {
  it("guards origin, session, rate limit and ownership like the sibling songs routes", async () => {
    const source = await fs.readFile("app/api/songs/[groupId]/publish/route.ts", "utf8");
    expect(source).toContain("rejectCrossSiteMutation(request)");
    expect(source).toContain("auth.api.getSession(");
    expect(source).toContain("rateLimit(`songs:publish:");
    expect(source).toContain("groupIdSchema.safeParse(");
    expect(source).toContain("error instanceof SongNotReadyError");
    expect(source).toContain("error instanceof MusicJobOwnershipError");
    expect(source).toContain('status: 409');
    expect(source).toContain('status: 404');
  });

  it("audits the publish action and never returns raw internal fields", async () => {
    const source = await fs.readFile("app/api/songs/[groupId]/publish/route.ts", "utf8");
    expect(source).toContain('action: "musicful.song.published"');
    expect(source).not.toContain("userId:");
  });
});

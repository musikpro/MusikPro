import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";

describe("PATCH /api/songs/[groupId]/cover", () => {
  it("rejects an untrusted image host before persisting it", async () => {
    const source = await fs.readFile("app/api/songs/[groupId]/cover/route.ts", "utf8");
    expect(source).toContain("isTrustedImageUrl(parsedBody.data.coverUrl)");
    expect(source).toContain('status: 400');
  });

  it("guards origin, content type, session, rate limit and ownership", async () => {
    const source = await fs.readFile("app/api/songs/[groupId]/cover/route.ts", "utf8");
    expect(source).toContain("rejectCrossSiteMutation(request)");
    expect(source).toContain('requireContentType(request, "application/json")');
    expect(source).toContain("auth.api.getSession(");
    expect(source).toContain("rateLimit(`songs:cover:");
    expect(source).toContain("error instanceof MusicJobOwnershipError");
  });
});

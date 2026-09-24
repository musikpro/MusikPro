import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";

// lib/ai/style-prompt.ts imports "server-only" and "@/db" (requires DATABASE_URL at import
// time), so — like the rest of this repo's Musicful tests — this is a static regression guard
// rather than a live unit test.
describe("Musicful prompt guidance: natural ending + variant diversity", () => {
  it("asks Musicful for a fade-out ending and a musically distinct pair in every style prompt", async () => {
    const source = await fs.readFile("lib/ai/style-prompt.ts", "utf8");
    expect(source).toContain("fade-out");
    expect(source).toContain("sans coupure brutale");
    expect(source).toContain("nettement distincts");
    // Applied unconditionally (not only when a catalog aiDescription or mood is set).
    expect(source).toContain("return `${withMood} — ${PRODUCTION_DIRECTIVES}`;");
  });

  it("asks the lyrics writer for a closing outro section instead of an abrupt end", async () => {
    const source = await fs.readFile("lib/ai/lyrics.ts", "utf8");
    expect(source).toContain("outro");
    expect(source).toContain("plutôt qu'une fin abrupte");
  });
});

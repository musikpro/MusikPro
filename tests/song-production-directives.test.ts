import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";

// The directive/truncation logic lives in style-prompt-builder.ts, which has no
// "server-only"/"@/db" import and so is covered by a live unit test instead
// (tests/style-prompt-length.test.ts). This file stays a static regression guard only for the
// pieces that do require the DB import (lib/ai/style-prompt.ts, lib/ai/lyrics.ts).
describe("Musicful prompt guidance: natural ending + variant diversity", () => {
  it("asks Musicful for a fade-out ending and a musically distinct pair in every style prompt", async () => {
    const source = await fs.readFile("lib/ai/style-prompt-builder.ts", "utf8");
    expect(source).toContain("fade-out");
    expect(source).toContain("sans coupure brutale");
    expect(source).toContain("nettement distincts");
    // Applied unconditionally (not only when a catalog aiDescription or mood is set), and always
    // kept intact by truncating the (possibly long) description first — see MUSICFUL_STYLE_MAX_LENGTH.
    expect(source).toContain("const suffix = ` — ${PRODUCTION_DIRECTIVES}`;");
    expect(source).toContain("return `${truncateAtWord(withMood, budget)}${suffix}`;");
  });

  it("asks the lyrics writer for a closing outro section instead of an abrupt end", async () => {
    const source = await fs.readFile("lib/ai/lyrics.ts", "utf8");
    expect(source).toContain("outro");
    expect(source).toContain("plutôt qu'une fin abrupte");
  });
});

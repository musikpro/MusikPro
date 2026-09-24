import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import { icons } from "lucide-react";

// Regression guard for a real bug found in production: components/banani/Icon.tsx converts
// "trash-2" to "Trash2" by default, but the installed lucide-react no longer exports a
// "Trash2" icon (only "Trash") — every "trash-2" usage across the app (the song-card delete
// button, several admin delete buttons) was silently falling back to the default Music icon
// instead of a trash can. Icon.tsx is a JSX component (no React-DOM test setup in this repo),
// so this checks the alias table and the underlying lucide-react export directly.
describe("Icon 'trash-2' alias", () => {
  it("lucide-react has no Trash2 export (documents why the alias is required)", () => {
    expect("Trash2" in icons).toBe(false);
    expect("Trash" in icons).toBe(true);
  });

  it("Icon.tsx aliases 'trash-2' to the real 'Trash' export", async () => {
    const source = await fs.readFile("components/banani/Icon.tsx", "utf8");
    expect(source).toMatch(/"trash-2":\s*"Trash"/);
  });
});

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("jetons OAuth de la table account", () => {
  it("restent chiffrés en base (account.encryptOAuthTokens)", () => {
    const source = readFileSync(join(process.cwd(), "lib/auth/index.ts"), "utf8");
    expect(source).toMatch(/account:\s*\{\s*encryptOAuthTokens:\s*true\s*\}/);
  });
});

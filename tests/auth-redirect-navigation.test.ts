import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "..");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(entry) ? [full] : [];
  });
}

describe("redirection après authentification", () => {
  it("n'utilise jamais router.push/replace vers /auth/continue (page blanche en WebView)", () => {
    const offenders = [...sourceFiles(path.join(root, "components")), ...sourceFiles(path.join(root, "app"))]
      .filter((file) => /router\.(push|replace)\(\s*["'`]\/auth\/continue/.test(readFileSync(file, "utf8")))
      .map((file) => path.relative(root, file));
    expect(offenders).toEqual([]);
  });

  it("les écrans de connexion, d'inscription et de 2FA passent par goToAuthenticatedSpace", () => {
    for (const file of [
      "components/auth-form.tsx",
      "components/two-factor-challenge.tsx",
      "components/two-factor-setup.tsx",
    ]) {
      expect(readFileSync(path.join(root, file), "utf8")).toContain("goToAuthenticatedSpace()");
    }
  });
});

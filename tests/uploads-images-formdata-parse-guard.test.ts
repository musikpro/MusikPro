import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";

describe("Upload d'image — lecture du corps de requête protégée", () => {
  it("n'appelle jamais request.formData() hors d'un bloc try/catch", async () => {
    const source = await fs.readFile("app/api/uploads/images/route.ts", "utf8");
    const callIndex = source.indexOf("request.formData()");
    expect(callIndex).toBeGreaterThan(-1);
    const tryIndex = source.lastIndexOf("try {", callIndex);
    expect(tryIndex).toBeGreaterThan(-1);
    expect(source).toContain("Impossible de lire le fichier envoyé.");
  });
});

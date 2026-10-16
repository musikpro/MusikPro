import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Garde-fou : tout fichier qui ÉCRIT dans une table de catalogue mise en cache (styles, occasions, langues) doit
 * invalider le cache correspondant. Sans cela, une modification admin resterait invisible jusqu'à l'expiration.
 * Si ce test échoue : appeler invalidateCatalogs("<catalogue>") (lib/catalog-cache/invalidate.ts) après l'écriture.
 */
const ROOT = path.resolve(__dirname, "..");
const SCANNED = ["app", "lib"];

const CATALOGS = [
  { name: "musicStyles", table: "musicStyles" },
  { name: "occasions", table: "occasions" },
  { name: "languages", table: "languages" },
] as const;

function walk(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next") continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) files.push(...walk(full));
    else if (/\.tsx?$/.test(entry)) files.push(full);
  }
  return files;
}

function writesTo(source: string, table: string): boolean {
  const orm = new RegExp(`\\.(insert|update|delete)\\(\\s*${table}\\s*\\)`);
  const rawSql = new RegExp(`\\b(update|insert\\s+into|delete\\s+from)\\s+\\$\\{${table}\\}`, "i");
  return orm.test(source) || rawSql.test(source);
}

describe("invalidation du cache des catalogues", () => {
  const files = SCANNED.flatMap((dir) => walk(path.join(ROOT, dir)));

  it("trouve bien les fichiers d'écriture connus (le garde-fou n'est pas vide)", () => {
    const writers = files.filter((file) => CATALOGS.some(({ table }) => writesTo(readFileSync(file, "utf8"), table)));
    const relative = writers.map((file) => path.relative(ROOT, file));
    expect(relative).toEqual(
      expect.arrayContaining([
        "app/admin/music-styles/actions.ts",
        "app/admin/occasions/actions.ts",
        "app/admin/languages/actions.ts",
      ]),
    );
  });

  for (const { name, table } of CATALOGS) {
    it(`tout fichier qui écrit dans « ${table} » invalide le catalogue « ${name} »`, () => {
      const missing: string[] = [];
      for (const file of files) {
        const source = readFileSync(file, "utf8");
        if (!writesTo(source, table)) continue;
        const invalidates =
          source.includes("invalidateCatalogs(") && new RegExp(`invalidateCatalogs\\([^)]*"${name}"`).test(source);
        if (!invalidates) missing.push(path.relative(ROOT, file));
      }
      expect(missing).toEqual([]);
    });
  }
});

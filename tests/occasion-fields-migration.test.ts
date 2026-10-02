import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync("db/migrations/0062_occasion_fields.sql", "utf8");
const journal = JSON.parse(readFileSync("db/migrations/meta/_journal.json", "utf8")) as {
  entries: Array<{ idx: number; tag: string; when: number }>;
};

describe("migration 0062_occasion_fields", () => {
  it("is idempotent", () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "occasion_fields"');
    expect(sql).toContain("CREATE UNIQUE INDEX IF NOT EXISTS");
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS "show_recipient"');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS "show_sender"');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS "title_field_id"');
    expect(sql).toContain('ON CONFLICT ("occasion_id", "key") DO NOTHING');
    expect(sql).not.toMatch(/DROP\s+(TABLE|COLUMN)/i);
  });

  it("cascades deletion from occasions and grants runtime/service roles", () => {
    expect(sql).toMatch(/REFERENCES "occasions"\("id"\) ON DELETE CASCADE/);
    expect(sql).toContain('GRANT SELECT ON TABLE "occasion_fields" TO musikpro_runtime;');
    expect(sql).toContain('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "occasion_fields" TO musikpro_service;');
  });

  it("seeds a field set for every default occasion plus the three hand-made ones", () => {
    for (const slug of [
      "anniversaire",
      "amour",
      "graduation",
      "fete",
      "separation",
      "gratitude",
      "serenite",
      "motivation",
      "sport",
      "priere-culte",
      "spot-publicitaire",
    ]) {
      expect(sql).toContain(`('${slug}',`);
    }
  });

  it("hides the recipient/sender blocks of the advertising spot and uses the product name as title", () => {
    expect(sql).toMatch(/UPDATE "occasions"[\s\S]*"show_recipient" = false[\s\S]*'spot-publicitaire'/);
    expect(sql).toContain("seed-spot-publicitaire-product_name");
  });

  it("is registered in the drizzle journal after 0061", () => {
    const position = journal.entries.findIndex((entry: { tag: string }) => entry.tag === "0062_occasion_fields");
    expect(position).toBeGreaterThan(0);
    const entry = journal.entries[position];
    const previous = journal.entries[position - 1];
    expect(previous.tag).toMatch(/^0061_/);
    expect(entry.idx).toBe(previous.idx + 1);
    expect(entry.when).toBe(previous.when + 1000);
  });
});

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("écriture de user.role réservée au rôle de service", () => {
  const migration = read("db/migrations/0062_guard_user_role_column.sql");

  it("la migration interdit au rôle applicatif d'attribuer ou de modifier un rôle", () => {
    expect(migration).toContain("current_user = 'musikpro_runtime'");
    expect(migration).toMatch(/NEW\.role <> 'user'/);
    expect(migration).toMatch(/NEW\.role IS DISTINCT FROM OLD\.role/);
    expect(migration).toMatch(/BEFORE INSERT OR UPDATE ON "user"/);
  });

  it("la migration est idempotente et donne au service UPDATE sur role et updated_at seulement", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION guard_user_role_column");
    expect(migration).toContain('DROP TRIGGER IF EXISTS user_role_column_guard ON "user"');
    expect(migration).toContain('GRANT UPDATE ("role", "updated_at") ON TABLE "user" TO musikpro_service');
    expect(migration).not.toMatch(/GRANT UPDATE ON TABLE "user"/);
  });

  it("la migration est enregistrée dans le journal Drizzle", () => {
    const journal = JSON.parse(read("db/migrations/meta/_journal.json")) as { entries: { tag: string }[] };
    expect(journal.entries.some((entry) => entry.tag === "0062_guard_user_role_column")).toBe(true);
  });

  it("l'action admin écrit le rôle via le rôle de service, plus via auth.api.setRole", () => {
    const actions = read("app/admin/users/actions.ts");
    expect(actions).not.toMatch(/auth\.api\.setRole\(/);
    expect(actions).toMatch(/getServiceDb\(\)\s*\.update\(user\)\s*\.set\(\{ role: parsed\.role/);
  });
});

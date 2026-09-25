import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { credits, user } from "@/db/schema";

// Run explicitly against the configured development database, never implicitly in CI.
describe.runIf(process.env.RUN_NEON_RLS_TEST === "1")("Drizzle runtime RLS", () => {
  it("isolates authenticated queries and clears pooled transaction context", async () => {
    const { db, getServiceDb, userQuery } = await import("@/db");
    const service = getServiceDb();
    const ids = [randomUUID(), randomUUID()];
    try {
      for (const id of ids) {
        await db.insert(user).values({ id, name: "RLS test", email: `${id}@example.invalid` });
        await service.insert(credits).values({ id, userId: id, balance: 1 });
      }
      const query = () => db.select().from(credits).where(inArray(credits.userId, ids));
      expect(await query()).toEqual([]);
      for (const id of ids) {
        const rows = await userQuery(id, query());
        expect(rows.map((row) => row.userId)).toEqual([id]);
      }
      expect(await query()).toEqual([]);
      await expect(userQuery("", query())).rejects.toThrow("Invalid authenticated database identity");
    } finally {
      await service.delete(credits).where(inArray(credits.userId, ids));
      for (const id of ids) await db.delete(user).where(eq(user.id, id));
    }
  }, 30000);
});

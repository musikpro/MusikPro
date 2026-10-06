import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";

vi.mock("server-only", () => ({}));

const batch = vi.hoisted(() => vi.fn());
const deleted: string[] = [];
const fakeDb = {
  select: () => ({ from: () => ({ where: () => ({ subquery: true }) }) }),
  delete: (table: object) => ({
    where: () => {
      deleted.push(getTableName(table as never));
      return { table };
    },
  }),
  batch,
};
vi.mock("@/db", () => ({ getServiceDb: () => fakeDb }));

import { purgeUserData } from "@/lib/account/purge-user-data";

describe("purgeUserData", () => {
  beforeEach(() => {
    deleted.length = 0;
    batch.mockReset();
    batch.mockResolvedValue([]);
  });

  it("removes the account's songs, public links, curation rows and draft in one atomic batch", async () => {
    await purgeUserData("user-1");
    expect(batch).toHaveBeenCalledTimes(1);
    expect(batch.mock.calls[0][0]).toHaveLength(10);
    expect(new Set(deleted)).toEqual(
      new Set([
        "discover_hidden_songs",
        "landing_song_features",
        "song_publications",
        "music_generation_jobs",
        "creation_drafts",
        "user_notifications",
        "push_devices",
        "notification_preferences",
      ]),
    );
  });

  it("never touches payments (accounting history is kept, detached by the foreign key)", async () => {
    await purgeUserData("user-1");
    expect(deleted).not.toContain("payments");
    expect(deleted).not.toContain("payment_attempts");
  });

  it("deletes the dependent curation rows before the songs they reference", async () => {
    await purgeUserData("user-1");
    expect(deleted.indexOf("song_publications")).toBeGreaterThan(deleted.lastIndexOf("landing_song_features"));
    expect(deleted.indexOf("music_generation_jobs")).toBeGreaterThan(deleted.lastIndexOf("discover_hidden_songs"));
  });

  it("rejects an empty or oversized identity without any query", async () => {
    await expect(purgeUserData("")).rejects.toThrow();
    await expect(purgeUserData("x".repeat(300))).rejects.toThrow();
    expect(batch).not.toHaveBeenCalled();
  });

  it("propagates a database failure so the account is never deleted half-purged", async () => {
    batch.mockRejectedValue(new Error("db down"));
    await expect(purgeUserData("user-1")).rejects.toThrow("db down");
  });
});

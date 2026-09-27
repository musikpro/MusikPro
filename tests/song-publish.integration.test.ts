import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { user, musicGenerationJobs, songPublications } from "@/db/schema";

// lib/ai/songs.ts (and lib/ai/music-jobs.ts, transitively) start with `import "server-only"`.
// That marker package always throws outside of Next.js's build, which sets a "react-server"
// resolve condition to swap in a no-op — a plain Vitest/Node run has no such condition, so the
// dynamic imports below would throw immediately without this mock. Stubbing the package here
// only affects this test file's module graph and does not touch production code or behavior.
vi.mock("server-only", () => ({}));

// Run explicitly against the configured development database, never implicitly in CI —
// same opt-in pattern as tests/db-runtime-rls.test.ts.
describe.runIf(process.env.RUN_DB_INTEGRATION_TESTS === "1")("Song publication (live integration)", () => {
  it("is idempotent, refuses unready songs, enforces ownership, and never leaks between users", async () => {
    // "user" only grants SELECT to musikpro_service (db/migrations/0002_service_grants.sql) —
    // insert/delete for the test fixture rows must go through the runtime role (`db`), the same
    // role better-auth uses for account management. music_generation_jobs/song_publications are
    // service-role-only tables (no grant for musikpro_runtime), so those go through getServiceDb().
    const { db, getServiceDb } = await import("@/db");
    const { publishSongGroup, getPublicSongBySlug, SongNotReadyError } = await import("@/lib/ai/songs");
    const { MusicJobOwnershipError } = await import("@/lib/ai/music-jobs");
    const service = getServiceDb();

    const ownerId = randomUUID();
    const otherId = randomUUID();
    const readyGroupId = randomUUID();
    const pendingGroupId = randomUUID();
    const readyJobId = randomUUID();
    const pendingJobId = randomUUID();

    try {
      await db.insert(user).values([
        { id: ownerId, name: "Publish test owner", email: `${ownerId}@example.invalid` },
        { id: otherId, name: "Publish test other", email: `${otherId}@example.invalid` },
      ]);
      await service.insert(musicGenerationJobs).values([
        {
          id: readyJobId,
          userId: ownerId,
          model: "test",
          status: "completed",
          audioUrl: "https://cdn.example.invalid/ready.mp3",
          title: "Chanson prête",
          songGroupId: readyGroupId,
          versionLabel: "Version 1",
        },
        {
          id: pendingJobId,
          userId: ownerId,
          model: "test",
          status: "processing",
          title: "Chanson en cours",
          songGroupId: pendingGroupId,
          versionLabel: "Version 1",
        },
      ]);

      // Not ready → SongNotReadyError, not a crash.
      await expect(publishSongGroup(ownerId, pendingGroupId)).rejects.toThrow(SongNotReadyError);

      // Ready → publishes once.
      const first = await publishSongGroup(ownerId, readyGroupId);
      expect(first.slug).toHaveLength(8);

      // Idempotent: republishing returns the exact same slug, no second row.
      const second = await publishSongGroup(ownerId, readyGroupId);
      expect(second.slug).toBe(first.slug);
      const rows = await service.select().from(songPublications).where(eq(songPublications.songGroupId, readyGroupId));
      expect(rows).toHaveLength(1);

      // Cross-user: the other user can never publish the owner's song.
      await expect(publishSongGroup(otherId, readyGroupId)).rejects.toThrow(MusicJobOwnershipError);

      // Public read exposes only the safe fields, for a real slug...
      const publicView = await getPublicSongBySlug(first.slug);
      expect(publicView).toEqual({
        title: "Chanson prête",
        style: null,
        occasion: null,
        coverUrl: null,
        audioUrl: "https://cdn.example.invalid/ready.mp3",
      });

      // ...and returns exactly the same `null` for a slug that never existed as for one that
      // was later unpublished (simulated here by a slug that was never inserted) — no
      // enumeration signal between the two cases.
      expect(await getPublicSongBySlug("never-existed")).toBeNull();
    } finally {
      await service.delete(songPublications).where(eq(songPublications.songGroupId, readyGroupId));
      await service.delete(musicGenerationJobs).where(eq(musicGenerationJobs.songGroupId, readyGroupId));
      await service.delete(musicGenerationJobs).where(eq(musicGenerationJobs.songGroupId, pendingGroupId));
      await db.delete(user).where(eq(user.id, ownerId));
      await db.delete(user).where(eq(user.id, otherId));
    }
  }, 30000);
});

import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";

// lib/ai/songs.ts importe "server-only" (transitivement "@/db", qui exige DATABASE_URL à
// l'import) — comme le reste des tests de ce fichier (song-style-label.test.ts,
// song-group-cover-url.test.ts), on vérifie le code source directement. Le comportement réel
// (idempotence, garde "pas prête", non-fuite, ownership croisée) est couvert par
// tests/song-publish.integration.test.ts, gated par RUN_DB_INTEGRATION_TESTS=1.
describe("Song publication (static regression)", () => {
  it("returns the existing slug instead of creating a second row (idempotent publish)", async () => {
    const source = await fs.readFile("lib/ai/songs.ts", "utf8");
    expect(source).toContain("export async function publishSongGroup(");
    expect(source).toContain("if (existing && !jobId) return { slug: existing.slug };");
  });

  it("refuses to publish a song whose chosen version isn't completed", async () => {
    const source = await fs.readFile("lib/ai/songs.ts", "utf8");
    expect(source).toContain("export class SongNotReadyError extends Error {}");
    expect(source).toContain('if (!chosen?.audioUrl || chosen.status !== "completed") throw new SongNotReadyError();');
  });

  it("never selects a public song row without a completed, audio-ready job", async () => {
    const source = await fs.readFile("lib/ai/songs.ts", "utf8");
    expect(source).toContain("export async function getPublicSongBySlug(");
    expect(source).toContain('if (!row || row.job.status !== "completed" || !row.job.audioUrl) return null;');
  });

  it("never exposes userId, prompt or lyrics in the public view", async () => {
    const source = await fs.readFile("lib/ai/songs.ts", "utf8");
    const match = source.match(/export type PublicSongView = \{[\s\S]*?\};/);
    expect(match).not.toBeNull();
    const typeBody = match![0];
    expect(typeBody).not.toContain("userId");
    expect(typeBody).not.toContain("prompt");
    expect(typeBody).not.toContain("lyrics");
  });
});

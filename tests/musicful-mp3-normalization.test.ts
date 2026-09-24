import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";

// lib/ai/music-jobs.ts imports "@/db" (a "server-only" module that requires DATABASE_URL at
// import time), so — like the rest of this repo's Musicful tests — this is a static regression
// guard rather than a live unit test, matching tests/cloudinary-image-validation.test.ts.
describe("Musicful v2 — MP3 Only", () => {
  it("verifies the real content-type and transcodes to MP3 via Cloudinary when needed, storing diagnostics only", async () => {
    const source = await fs.readFile("lib/ai/music-jobs.ts", "utf8");
    expect(source).toContain("export async function ensureVerifiedMp3(");
    expect(source).toContain('"audio/mpeg"');
    expect(source).toContain("transcodeRemoteAudioToMp3");
    expect(source).toContain("isCloudinaryConfigured");
    // audioUrl stays the sole field read by the UI (no new user-facing contract) — only
    // diagnostics are added alongside it.
    expect(source).toContain("audioMimeType: isCompleted ? mp3Result.mimeType : job.audioMimeType");
    expect(source).toContain("audioNormalized: isCompleted ? mp3Result.normalized : job.audioNormalized");
  });

  it("never marks a job completed without a verified MP3 result", async () => {
    const source = await fs.readFile("lib/ai/music-jobs.ts", "utf8");
    expect(source).toContain("const isCompleted = !isFailed && Boolean(mp3Result.url);");
  });

  it("marks a job failed instead of polling forever once maxPollingMinutes elapses without a verified MP3", async () => {
    const source = await fs.readFile("lib/ai/music-jobs.ts", "utf8");
    expect(source).toContain("const isTimedOut = !isCompleted && !isFailed && elapsedMinutes > provider.maxPollingMinutes;");
    expect(source).toContain("isFailed || isTimedOut ? (\"failed\" as const)");
  });

  it("has no MP4 generation/conversion path left anywhere in the Musicful integration", async () => {
    const musicfulClient = await fs.readFile("lib/ai/musicful.ts", "utf8");
    const musicJobs = await fs.readFile("lib/ai/music-jobs.ts", "utf8");
    const validation = await fs.readFile("lib/validation/ai.ts", "utf8");
    const adminForm = await fs.readFile("components/admin/AdminMusicfulProviderForm.tsx", "utf8");
    for (const source of [musicfulClient, musicJobs, validation, adminForm]) {
      expect(source).not.toContain("convertToMp4");
      expect(source).not.toContain("generate-mp4");
      expect(source).not.toContain("allowMp4Conversion");
      expect(source).not.toContain("requestMp4Conversion");
    }
  });

  it("removed the dead MP4 conversion route", async () => {
    await expect(fs.access("app/api/music/jobs/[id]/mp4/route.ts")).rejects.toThrow();
  });

  it("transcodes remote audio to a real MP3 through a signed Cloudinary upload", async () => {
    const source = await fs.readFile("lib/storage/cloudinary.ts", "utf8");
    expect(source).toContain("export async function transcodeRemoteAudioToMp3(");
    expect(source).toContain("format: \"mp3\"");
    expect(source).toContain("/video/upload");
    expect(source).toContain("Only https remote URLs can be transcoded");
  });
});

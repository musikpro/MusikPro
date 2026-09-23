import { describe, expect, it } from "vitest";
import { musicfulGenerateRequestSchema, musicfulSettingsSchema, musicfulTaskSchema, musicfulTasksSchema } from "@/lib/validation/ai";

describe("Musicful settings validation", () => {
  const validSettings = {
    apiKey: "",
    enabled: "true",
    defaultModel: "MFV3.0",
    defaultInstrumental: "false",
    defaultGender: "",
    requestTimeoutMs: "60000",
    pollingIntervalMs: "5000",
    maxPollingMinutes: "10",
    maxRetries: "2",
    allowTextToMusic: true,
    allowLyricsToMusic: true,
    allowInstrumental: true,
    allowLyricsGenerator: true,
    allowVibe: true,
    allowWavConversion: true,
    allowMp4Conversion: true,
    preferredAudioFormat: "native",
    maxGenerationsPerUserPerDay: "5",
    maxGenerationsPerUserPerHour: "2",
    maxConcurrentJobs: "2",
  };

  it("accepts an empty API key to preserve the encrypted key", () => {
    expect(musicfulSettingsSchema.safeParse(validSettings).success).toBe(true);
  });

  it("rejects an unsupported model identifier", () => {
    expect(musicfulSettingsSchema.safeParse({ ...validSettings, defaultModel: "MFV9.9" }).success).toBe(false);
  });

  it("rejects an unsupported gender value", () => {
    expect(musicfulSettingsSchema.safeParse({ ...validSettings, defaultGender: "nonbinary" }).success).toBe(false);
  });

  it("rejects an unsupported preferred audio format", () => {
    expect(musicfulSettingsSchema.safeParse({ ...validSettings, preferredAudioFormat: "mp4" }).success).toBe(false);
  });
});

describe("Musicful generate request validation", () => {
  it("accepts an auto-mode style-only request", () => {
    expect(musicfulGenerateRequestSchema.safeParse({ style: "Afrobeat joyeux", instrumental: 0 }).success).toBe(true);
  });

  it("rejects an instrumental flag outside 0/1", () => {
    expect(musicfulGenerateRequestSchema.safeParse({ style: "Afrobeat", instrumental: 2 }).success).toBe(false);
  });
});

describe("Musicful task response validation", () => {
  it("accepts a documented completed task payload", () => {
    const task = {
      id: "task_123",
      duration: 180,
      status: 1,
      title: "Ma chanson",
      audio_url: "https://cdn.musicful.ai/song.mp3",
      song_id: "song_123",
    };
    expect(musicfulTaskSchema.safeParse(task).success).toBe(true);
    expect(musicfulTasksSchema.safeParse([task]).success).toBe(true);
  });

  it("rejects a task payload missing required numeric fields", () => {
    expect(musicfulTaskSchema.safeParse({ id: "task_123" }).success).toBe(false);
  });
});

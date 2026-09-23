import { z } from "zod";

export const openAiSettingsSchema = z.object({
  apiKey: z.string().trim().min(20).max(500).optional().or(z.literal("")),
  enabled: z.enum(["true", "false"]),
  defaultModel: z.string().trim().min(1).max(100),
  maxOutputTokens: z.coerce.number().int().min(100).max(128_000),
  requestsPerMinute: z.coerce.number().int().min(1).max(120),
  lyricsGenerationEnabled: z.enum(["true", "false"]),
  lyricsRewriteEnabled: z.enum(["true", "false"]),
  isDefaultForLyrics: z.enum(["true", "false"]),
});

export const anthropicSettingsSchema = openAiSettingsSchema.extend({
  defaultModel: z.string().trim().min(3).max(150),
});

const musicfulModelEnum = z.enum(["MFV3.0", "MFV2.0", "MFV1.5X", "MFV1.5", "MFV1.0"]);
const musicfulGenderEnum = z.enum(["male", "female", ""]);

export const musicfulSettingsSchema = z.object({
  apiKey: z.string().trim().min(10).max(500).optional().or(z.literal("")),
  enabled: z.enum(["true", "false"]),
  defaultModel: musicfulModelEnum,
  defaultInstrumental: z.enum(["true", "false"]),
  defaultGender: musicfulGenderEnum,
  requestTimeoutMs: z.coerce.number().int().min(5_000).max(120_000),
  pollingIntervalMs: z.coerce.number().int().min(2_000).max(30_000),
  maxPollingMinutes: z.coerce.number().int().min(1).max(60),
  maxRetries: z.coerce.number().int().min(0).max(5),
  allowTextToMusic: z.boolean(),
  allowLyricsToMusic: z.boolean(),
  allowInstrumental: z.boolean(),
  allowLyricsGenerator: z.boolean(),
  allowVibe: z.boolean(),
  allowWavConversion: z.boolean(),
  allowMp4Conversion: z.boolean(),
  maxGenerationsPerUserPerDay: z.coerce.number().int().min(1).max(1_000),
  maxGenerationsPerUserPerHour: z.coerce.number().int().min(1).max(1_000),
  maxConcurrentJobs: z.coerce.number().int().min(1).max(50),
});

export const musicfulGenerateRequestSchema = z.object({
  title: z.string().trim().max(200).optional(),
  prompt: z.string().trim().max(5_000).optional(),
  lyrics: z.string().trim().max(5_000).optional(),
  style: z.string().trim().max(5_000).optional(),
  model: musicfulModelEnum.optional(),
  instrumental: z.union([z.literal(0), z.literal(1)]).optional(),
  gender: musicfulGenderEnum.optional(),
});

export type MusicfulGenerateRequest = z.infer<typeof musicfulGenerateRequestSchema>;

export const songGenerateRequestSchema = z.object({
  occasion: z.string().trim().min(1).max(100),
  genre: z.string().trim().min(1).max(100),
  mood: z.string().trim().max(100).optional().default(""),
  voice: z.string().trim().max(80).optional().default(""),
  lyrics: z.string().trim().min(1).max(30_000),
});

export type SongGenerateRequest = z.infer<typeof songGenerateRequestSchema>;

export const musicfulApiKeyInfoSchema = z.object({
  key_status: z.number(),
  key_music_counts: z.union([z.number(), z.string()]),
  email: z.string().nullable().optional(),
  member_id: z.string().nullable().optional(),
  key_created_at: z.string().nullable().optional(),
  key_updated_at: z.string().nullable().optional(),
  key_recently_used_at: z.string().nullable().optional(),
  key_name: z.string().nullable().optional(),
});

export const musicfulTaskSchema = z.object({
  id: z.string(),
  duration: z.number(),
  status: z.number(),
  title: z.string().nullable().optional(),
  style: z.string().nullable().optional(),
  audio_url: z.string().url().nullable().optional(),
  cover_url: z.string().url().nullable().optional(),
  song_id: z.string().nullable().optional(),
  lyric: z.string().nullable().optional(),
  fail_code: z.number().nullable().optional(),
  fail_reason: z.string().nullable().optional(),
});

export const musicfulTasksSchema = z.array(musicfulTaskSchema);

const lyricsContextSchema = z.object({
  occasion: z.string().trim().min(1).max(100),
  story: z.string().trim().min(2).max(5_000),
  recipientName: z.string().trim().max(120).optional().default(""),
  recipientRelation: z.string().trim().max(120).optional().default(""),
  recipientPronunciation: z.string().trim().max(300).optional().default(""),
  genre: z.string().trim().min(1).max(100),
  mood: z.string().trim().max(100).optional().default(""),
  language: z.string().trim().min(1).max(50),
  voice: z.string().trim().min(1).max(80),
  additionalDetails: z.string().trim().max(1_000).optional().default(""),
});

export const aiLyricsTaskSchema = z.discriminatedUnion("task", [
  z.object({ task: z.literal("lyrics.generate"), input: lyricsContextSchema }),
  z.object({
    task: z.literal("lyrics.extend"),
    input: lyricsContextSchema.extend({ lyrics: z.string().trim().min(20).max(30_000) }),
  }),
  z.object({
    task: z.literal("lyrics.rewrite"),
    input: lyricsContextSchema.extend({
      lyrics: z.string().trim().min(1).max(30_000),
      instruction: z.string().trim().min(2).max(3_000),
    }),
  }),
]);

export type AiLyricsTask = z.infer<typeof aiLyricsTaskSchema>;

export const pronunciationRequestSchema = z.object({
  name: z.string().trim().min(1).max(120),
  language: z.string().trim().max(50).optional().default(""),
});

export type PronunciationRequest = z.infer<typeof pronunciationRequestSchema>;

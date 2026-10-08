import { z } from "zod";
import { occasionAnswersSchema } from "@/lib/occasion-fields/answers";
import { DEMO_DETAIL_MAX_CHARACTERS, DEMO_STORY_MAX_CHARACTERS } from "./musikpro-demo";

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
export const musicfulAudioFormatEnum = z.enum(["native", "wav"]);

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
  preferredAudioFormat: musicfulAudioFormatEnum,
  strictStyleAdherence: z.boolean(),
  maxGenerationsPerUserPerDay: z.coerce.number().int().min(1).max(1_000),
  maxGenerationsPerUserPerHour: z.coerce.number().int().min(1).max(1_000),
  maxConcurrentJobs: z.coerce.number().int().min(1).max(50),
  versionsPerGeneration: z.coerce.number().int().min(1).max(3),
  redirectDelaySeconds: z.coerce.number().int().min(10).max(1_800),
  keepExtraGeneratedVariant: z.enum(["true", "false"]),
});

/** Generic settings of any non-Musicful audio provider (lib/ai/audio-providers/catalog.ts). */
export const audioProviderSettingsSchema = z.object({
  provider: z.string().trim().min(2).max(40),
  apiKey: z.string().trim().min(8).max(1_000).optional().or(z.literal("")),
  enabled: z.enum(["true", "false"]),
  apiBaseUrl: z
    .string()
    .trim()
    .url("URL invalide")
    .max(300)
    .refine((value) => value.startsWith("https://"), "l’URL doit commencer par https://")
    .or(z.literal("")),
  defaultModel: z.string().trim().max(120),
  defaultInstrumental: z.enum(["true", "false"]),
  defaultGender: musicfulGenderEnum,
  requestTimeoutMs: z.coerce.number().int().min(5_000).max(120_000),
  pollingIntervalMs: z.coerce.number().int().min(2_000).max(30_000),
  maxPollingMinutes: z.coerce.number().int().min(1).max(60),
  maxRetries: z.coerce.number().int().min(0).max(5),
  allowLyricsToMusic: z.boolean(),
  strictStyleAdherence: z.boolean(),
  maxGenerationsPerUserPerDay: z.coerce.number().int().min(1).max(1_000),
  maxGenerationsPerUserPerHour: z.coerce.number().int().min(1).max(1_000),
  maxConcurrentJobs: z.coerce.number().int().min(1).max(50),
  versionsPerGeneration: z.coerce.number().int().min(1).max(3),
  redirectDelaySeconds: z.coerce.number().int().min(10).max(1_800),
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
  recipientName: z.string().trim().max(120).optional().default(""),
  mood: z.string().trim().max(100).optional().default(""),
  voice: z.string().trim().max(80).optional().default(""),
  language: z.string().trim().max(80).optional().default(""),
  lyrics: z.string().trim().min(1).max(30_000),
  occasionDetails: occasionAnswersSchema,
  /** Case « Partager dans Découvrir » de la création : décochée par défaut, rien n'est public sans ce choix. */
  shareToDiscover: z.boolean().optional().default(false),
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

/**
 * Musicful reports `audio_url` / `cover_url` as an EMPTY STRING while a task is still processing (and
 * the cover can land well after the audio). A strict `.url()` made the whole task fail to parse in
 * those states, so the poll threw, the job stayed "processing", and a song whose MP3 was already
 * ready was only detected once the cover URL also became valid. An empty or malformed value is
 * treated as "not available yet" instead — each field is judged on its own.
 */
const optionalUrl = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().url().nullable().optional().catch(null),
);

export const musicfulTaskSchema = z.object({
  id: z.string(),
  duration: z.number(),
  status: z.number(),
  title: z.string().nullable().optional(),
  style: z.string().nullable().optional(),
  audio_url: optionalUrl,
  cover_url: optionalUrl,
  song_id: z.string().nullable().optional(),
  lyric: z.string().nullable().optional(),
  fail_code: z.number().nullable().optional(),
  fail_reason: z.string().nullable().optional(),
});

export const musicfulTasksSchema = z.array(musicfulTaskSchema);

export const anthropicAdminKeySettingsSchema = z.object({
  adminApiKey: z.string().trim().min(10).max(500).optional().or(z.literal("")),
});

const anthropicCostResultSchema = z.object({
  amount: z.string(),
  currency: z.string(),
});

export const anthropicCostReportSchema = z.object({
  data: z.array(
    z.object({
      starting_at: z.string(),
      ending_at: z.string(),
      results: z.array(anthropicCostResultSchema),
    }),
  ),
  has_more: z.boolean(),
  next_page: z.string().nullable().optional(),
});

const lyricsContextSchema = z.object({
  occasion: z.string().trim().min(1).max(100),
  story: z.string().trim().min(2).max(DEMO_STORY_MAX_CHARACTERS),
  recipientName: z.string().trim().max(120).optional().default(""),
  recipientRelation: z.string().trim().max(120).optional().default(""),
  recipientPronunciation: z.string().trim().max(300).optional().default(""),
  senderName: z.string().trim().max(120).optional().default(""),
  senderPronunciation: z.string().trim().max(300).optional().default(""),
  genre: z.string().trim().min(1).max(100),
  mood: z.string().trim().max(100).optional().default(""),
  language: z.string().trim().min(1).max(50),
  voice: z.string().trim().min(1).max(80),
  additionalDetails: z.string().trim().max(DEMO_DETAIL_MAX_CHARACTERS).optional().default(""),
  occasionDetails: occasionAnswersSchema,
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

export const musicStyleDescriptionKindSchema = z.enum(["client", "ai"]);

export const musicStyleDescriptionRequestSchema = z.object({
  styleName: z.string().trim().min(2).max(60),
  kind: musicStyleDescriptionKindSchema,
  otherDescription: z.string().trim().max(600).optional(),
});

export type MusicStyleDescriptionRequest = z.infer<typeof musicStyleDescriptionRequestSchema>;

export const accentHintRequestSchema = z.object({
  languageName: z.string().trim().min(2).max(60),
  country: z.string().trim().min(2).max(80),
  styleNames: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
});

export type AccentHintRequest = z.infer<typeof accentHintRequestSchema>;

export const phonePrefixRequestSchema = z.object({
  countryCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/),
  countryName: z.string().trim().min(2).max(80),
});

export type PhonePrefixRequest = z.infer<typeof phonePrefixRequestSchema>;

export const pronunciationRequestSchema = z.object({
  name: z.string().trim().min(1).max(120),
  language: z.string().trim().max(50).optional().default(""),
});

export type PronunciationRequest = z.infer<typeof pronunciationRequestSchema>;

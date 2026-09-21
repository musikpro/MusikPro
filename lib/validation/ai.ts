import { z } from "zod";

export const openAiSettingsSchema = z.object({
  apiKey: z.string().trim().min(20).max(500).optional().or(z.literal("")),
  enabled: z.enum(["true", "false"]),
  defaultModel: z.string().trim().min(1).max(100),
  maxOutputTokens: z.coerce.number().int().min(100).max(128_000),
  requestsPerMinute: z.coerce.number().int().min(1).max(120),
  lyricsGenerationEnabled: z.enum(["true", "false"]),
  lyricsRewriteEnabled: z.enum(["true", "false"]),
});

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

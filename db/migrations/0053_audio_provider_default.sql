ALTER TABLE "audio_provider_configs" ADD COLUMN IF NOT EXISTS "is_default_for_audio" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
UPDATE "audio_provider_configs" SET "is_default_for_audio" = true
WHERE "provider" = 'musicful'
  AND NOT EXISTS (SELECT 1 FROM "audio_provider_configs" WHERE "is_default_for_audio" = true);

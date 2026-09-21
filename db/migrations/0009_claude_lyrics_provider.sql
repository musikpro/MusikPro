ALTER TABLE "ai_provider_configs"
ADD COLUMN "is_default_for_lyrics" boolean DEFAULT false NOT NULL;

UPDATE "ai_provider_configs"
SET "is_default_for_lyrics" = true
WHERE "provider" = 'openai';

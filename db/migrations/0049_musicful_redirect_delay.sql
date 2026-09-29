ALTER TABLE "audio_provider_configs" ADD COLUMN IF NOT EXISTS "redirect_delay_seconds" integer DEFAULT 180 NOT NULL;

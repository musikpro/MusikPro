ALTER TABLE "audio_provider_configs" ADD COLUMN IF NOT EXISTS "webhook_token_ciphertext" text;
--> statement-breakpoint
ALTER TABLE "audio_provider_configs" ADD COLUMN IF NOT EXISTS "webhook_token_iv" text;
--> statement-breakpoint
ALTER TABLE "audio_provider_configs" ADD COLUMN IF NOT EXISTS "webhook_token_auth_tag" text;

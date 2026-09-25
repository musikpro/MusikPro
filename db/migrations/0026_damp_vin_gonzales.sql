ALTER TABLE "ai_provider_configs" ADD COLUMN "admin_api_key_ciphertext" text;--> statement-breakpoint
ALTER TABLE "ai_provider_configs" ADD COLUMN "admin_api_key_iv" text;--> statement-breakpoint
ALTER TABLE "ai_provider_configs" ADD COLUMN "admin_api_key_auth_tag" text;--> statement-breakpoint
ALTER TABLE "ai_provider_configs" ADD COLUMN "admin_api_key_last4" text;
CREATE TABLE "ai_provider_configs" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text DEFAULT 'openai' NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"api_key_ciphertext" text,
	"api_key_iv" text,
	"api_key_auth_tag" text,
	"api_key_last4" text,
	"default_model" text DEFAULT 'gpt-5.6-terra' NOT NULL,
	"max_output_tokens" integer DEFAULT 4000 NOT NULL,
	"requests_per_minute" integer DEFAULT 10 NOT NULL,
	"lyrics_generation_enabled" boolean DEFAULT true NOT NULL,
	"lyrics_rewrite_enabled" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ai_provider_configs_provider_unique" UNIQUE("provider")
);
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "ai_provider_configs" TO musikpro_service;

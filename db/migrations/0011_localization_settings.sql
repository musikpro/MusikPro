CREATE TABLE "localization_settings" (
	"id" text PRIMARY KEY DEFAULT 'global' NOT NULL,
	"automatic_detection_enabled" boolean DEFAULT true NOT NULL,
	"default_language_code" text DEFAULT 'fr' NOT NULL,
	"country_cache_ttl_seconds" integer DEFAULT 604800 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "localization_settings" ("id", "automatic_detection_enabled", "default_language_code", "country_cache_ttl_seconds")
VALUES ('global', true, 'fr', 604800)
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
GRANT SELECT ON TABLE "localization_settings" TO musikpro_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON TABLE "localization_settings" TO musikpro_service;

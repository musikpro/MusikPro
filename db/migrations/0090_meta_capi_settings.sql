CREATE TABLE IF NOT EXISTS "meta_capi_settings" (
	"id" text PRIMARY KEY DEFAULT 'global' NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"pixel_id" text,
	"token_ciphertext" text,
	"token_iv" text,
	"token_auth_tag" text,
	"token_last4" text,
	"test_event_code" text,
	"updated_by" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "meta_capi_settings" ADD CONSTRAINT "meta_capi_settings_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
INSERT INTO "meta_capi_settings" ("id", "enabled")
VALUES ('global', false)
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON TABLE "meta_capi_settings" TO musikpro_service;

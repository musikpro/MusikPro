CREATE TABLE IF NOT EXISTS "playback_settings" (
	"id" text PRIMARY KEY DEFAULT 'global' NOT NULL,
	"exclusive_playback_enabled" boolean DEFAULT true NOT NULL,
	"updated_by" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "playback_settings" ADD CONSTRAINT "playback_settings_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
GRANT SELECT ON TABLE "playback_settings" TO musikpro_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "playback_settings" TO musikpro_service;

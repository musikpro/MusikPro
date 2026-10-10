CREATE TABLE IF NOT EXISTS "admin_display_settings" (
	"id" text PRIMARY KEY DEFAULT 'global' NOT NULL,
	"generations_per_page" integer DEFAULT 50 NOT NULL,
	"updated_by" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "admin_display_settings" ADD CONSTRAINT "admin_display_settings_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
GRANT SELECT ON TABLE "admin_display_settings" TO musikpro_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "admin_display_settings" TO musikpro_service;

CREATE TABLE IF NOT EXISTS "discover_settings" (
	"id" text PRIMARY KEY DEFAULT 'global' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"sort_by" text DEFAULT 'recent' NOT NULL,
	"max_items" integer DEFAULT 60 NOT NULL,
	"updated_by" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "discover_hidden_songs" (
	"song_group_id" text PRIMARY KEY NOT NULL,
	"hidden_by" text DEFAULT 'owner' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "discover_settings" ADD CONSTRAINT "discover_settings_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
GRANT SELECT ON TABLE "discover_settings" TO musikpro_runtime;
--> statement-breakpoint
GRANT SELECT ON TABLE "discover_hidden_songs" TO musikpro_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "discover_settings" TO musikpro_service;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "discover_hidden_songs" TO musikpro_service;

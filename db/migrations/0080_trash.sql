CREATE TABLE IF NOT EXISTS "trash_settings" (
	"id" text PRIMARY KEY DEFAULT 'global' NOT NULL,
	"songs_retention_days" integer DEFAULT 30 NOT NULL,
	"users_retention_days" integer DEFAULT 30 NOT NULL,
	"updated_by" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "trashed_songs" (
	"song_key" text PRIMARY KEY NOT NULL,
	"title" text,
	"owner_id" text,
	"owner_email" text,
	"versions" integer DEFAULT 1 NOT NULL,
	"snapshot" jsonb NOT NULL,
	"deleted_by" text,
	"deleted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "trashed_users" (
	"user_id" text PRIMARY KEY NOT NULL,
	"deleted_by" text,
	"previous_banned" boolean DEFAULT false NOT NULL,
	"previous_ban_reason" text,
	"deleted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "trash_settings" ADD CONSTRAINT "trash_settings_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "trashed_users" ADD CONSTRAINT "trashed_users_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "trash_settings" TO musikpro_service;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "trashed_songs" TO musikpro_service;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "trashed_users" TO musikpro_service;

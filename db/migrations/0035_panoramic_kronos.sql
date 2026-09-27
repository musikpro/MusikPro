CREATE TABLE "ambient_background_track" (
	"id" text PRIMARY KEY DEFAULT 'global' NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"song_group_id" text,
	"job_id" text,
	"title" text,
	"audio_url" text,
	"volume_percent" integer DEFAULT 20 NOT NULL,
	"updated_by" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ambient_background_track" ADD CONSTRAINT "ambient_background_track_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
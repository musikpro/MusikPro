ALTER TABLE "music_generation_jobs" ADD COLUMN "occasion" text;
--> statement-breakpoint
ALTER TABLE "music_generation_jobs" ADD COLUMN "song_group_id" text;
--> statement-breakpoint
ALTER TABLE "music_generation_jobs" ADD COLUMN "version_label" text;
--> statement-breakpoint
ALTER TABLE "music_generation_jobs" ADD COLUMN "plays" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "music_generation_jobs" ADD COLUMN "liked" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
CREATE INDEX "music_generation_jobs_song_group_idx" ON "music_generation_jobs" USING btree ("user_id","song_group_id");

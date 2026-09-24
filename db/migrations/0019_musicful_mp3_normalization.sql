ALTER TABLE "music_generation_jobs" ADD COLUMN "audio_mime_type" text;
ALTER TABLE "music_generation_jobs" ADD COLUMN "audio_normalized" boolean DEFAULT false NOT NULL;

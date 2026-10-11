ALTER TABLE "admin_display_settings" ADD COLUMN IF NOT EXISTS "landing_showcase_title_max_chars" integer DEFAULT 40 NOT NULL;
--> statement-breakpoint
ALTER TABLE "admin_display_settings" ADD COLUMN IF NOT EXISTS "landing_library_title_max_chars" integer DEFAULT 40 NOT NULL;
--> statement-breakpoint
ALTER TABLE "admin_display_settings" ADD COLUMN IF NOT EXISTS "trending_title_max_chars" integer DEFAULT 40 NOT NULL;
--> statement-breakpoint
ALTER TABLE "admin_display_settings" ADD COLUMN IF NOT EXISTS "landing_music_styles_max_count" integer DEFAULT 12 NOT NULL;

ALTER TABLE "admin_display_settings" ADD COLUMN IF NOT EXISTS "discover_title_max_chars" integer DEFAULT 40 NOT NULL;

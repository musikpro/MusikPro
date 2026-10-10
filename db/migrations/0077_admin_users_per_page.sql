ALTER TABLE "admin_display_settings" ADD COLUMN IF NOT EXISTS "users_per_page" integer DEFAULT 50 NOT NULL;

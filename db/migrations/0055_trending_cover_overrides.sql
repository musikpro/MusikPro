ALTER TABLE "trending_settings" ADD COLUMN IF NOT EXISTS "cover_overrides" jsonb DEFAULT '{}'::jsonb NOT NULL;

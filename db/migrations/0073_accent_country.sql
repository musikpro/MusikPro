ALTER TABLE "language_accents" ADD COLUMN IF NOT EXISTS "country" text DEFAULT '' NOT NULL;

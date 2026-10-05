CREATE TABLE IF NOT EXISTS "language_accents" (
	"id" text PRIMARY KEY NOT NULL,
	"language_code" text NOT NULL,
	"name" text NOT NULL,
	"ai_hint" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "music_style_accents" (
	"style_id" text NOT NULL,
	"accent_id" text NOT NULL,
	"language_code" text NOT NULL,
	CONSTRAINT "music_style_accents_style_id_language_code_pk" PRIMARY KEY("style_id","language_code")
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "language_accents" ADD CONSTRAINT "language_accents_language_code_languages_code_fk" FOREIGN KEY ("language_code") REFERENCES "public"."languages"("code") ON DELETE cascade ON UPDATE cascade;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "music_style_accents" ADD CONSTRAINT "music_style_accents_style_id_music_styles_id_fk" FOREIGN KEY ("style_id") REFERENCES "public"."music_styles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "music_style_accents" ADD CONSTRAINT "music_style_accents_accent_id_language_accents_id_fk" FOREIGN KEY ("accent_id") REFERENCES "public"."language_accents"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "language_accents_language_idx" ON "language_accents" USING btree ("language_code","active","sort_order");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "music_style_accents_accent_idx" ON "music_style_accents" USING btree ("accent_id");
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "language_accents" TO musikpro_service;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "music_style_accents" TO musikpro_service;

CREATE TABLE IF NOT EXISTS "moods" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"emoji" text DEFAULT '🎶' NOT NULL,
	"ai_hint" text DEFAULT '' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 100 NOT NULL,
	"translations" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "moods_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "moods_active_order_idx" ON "moods" USING btree ("active","sort_order");
--> statement-breakpoint
INSERT INTO "moods" ("id", "name", "slug", "description", "emoji", "ai_hint", "active", "sort_order") VALUES
	('default-energetic', 'Énergique', 'energique', 'Dynamique et entraînante.', '🚀', 'energetic, upbeat, driving rhythm, high tempo', true, 10),
	('default-romantic', 'Romantique', 'romantique', 'Tendre et sensible.', '💕', 'romantic, tender, warm, heartfelt, intimate', true, 20),
	('default-epic', 'Épique', 'epique', 'Grandiose et majestueuse.', '👑', 'epic, majestic, grand, cinematic, powerful build-up', true, 30),
	('default-joyful', 'Joyeuse', 'joyeuse', 'Fun et pleine de bonne humeur.', '😂', 'joyful, fun, cheerful, feel-good, bright', true, 40),
	('default-dramatic', 'Dramatique', 'dramatique', 'Intense et théâtrale.', '🎭', 'dramatic, intense, emotional, theatrical, powerful', true, 50),
	('default-mystic', 'Mystique', 'mystique', 'Magique et envoûtante.', '🌙', 'mystical, magical, ethereal, enchanting, atmospheric', true, 60)
ON CONFLICT ("slug") DO NOTHING;
--> statement-breakpoint
GRANT SELECT ON TABLE "moods" TO musikpro_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "moods" TO musikpro_service;

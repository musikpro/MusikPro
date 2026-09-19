CREATE TABLE "music_styles" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text NOT NULL,
	"icon" text DEFAULT 'music-2' NOT NULL,
	"tone" text DEFAULT 'orange' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "music_styles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE INDEX "music_styles_active_order_idx" ON "music_styles" USING btree ("active","sort_order");
--> statement-breakpoint
INSERT INTO "music_styles" ("id", "name", "slug", "description", "icon", "tone", "active", "sort_order") VALUES
	('default-afrobeat', 'Afrobeat', 'afrobeat', 'Rythmes africains énergiques et dansants', 'drum', 'orange', true, 10),
	('default-amapiano', 'Amapiano', 'amapiano', 'Piano et percussions sud-africaines', 'audio-waveform', 'violet', true, 20),
	('default-gospel', 'Gospel', 'gospel', 'Émotion, spiritualité et voix inspirantes', 'church', 'green', true, 30),
	('default-rnb', 'R&B', 'r-and-b', 'Son doux, moderne et émotionnel', 'heart-pulse', 'rose', true, 40),
	('default-acoustique', 'Acoustique', 'acoustique', 'Instruments naturels et ambiance intime', 'guitar', 'amber', true, 50),
	('default-reggae', 'Reggae', 'reggae', 'Rythme chaleureux, détendu et positif', 'music-2', 'green', true, 60)
ON CONFLICT ("slug") DO NOTHING;
--> statement-breakpoint
GRANT SELECT ON TABLE "music_styles" TO musikpro_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "music_styles" TO musikpro_service;

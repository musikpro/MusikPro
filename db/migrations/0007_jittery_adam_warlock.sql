CREATE TABLE "library_collections" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"access" text DEFAULT 'public' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"styles" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sort_order" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "library_collections_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE INDEX "library_collections_publication_order_idx" ON "library_collections" USING btree ("active","access","sort_order");
--> statement-breakpoint
INSERT INTO "library_collections" ("id", "name", "slug", "description", "access", "active", "styles", "sort_order") VALUES
	('collection-afro', 'Afrobeat Essentials', 'afrobeat-essentials', 'Les rythmes africains les plus énergiques du moment.', 'public', true, '["Afrobeat","Afro-Pop"]'::jsonb, 10),
	('collection-gospel', 'Gospel & inspiration', 'gospel-inspiration', 'Des voix puissantes pour célébrer la foi et la gratitude.', 'public', true, '["Gospel"]'::jsonb, 20),
	('collection-amapiano', 'Ambiance Amapiano', 'ambiance-amapiano', 'Pianos, percussions et énergie sud-africaine.', 'public', true, '["Amapiano"]'::jsonb, 30),
	('collection-emotions', 'Douceur & émotions', 'douceur-emotions', 'Une sélection sensible pour l’amour et les moments intimes.', 'public', true, '["R&B","Acoustique"]'::jsonb, 40)
ON CONFLICT ("slug") DO NOTHING;
--> statement-breakpoint
GRANT SELECT ON TABLE "library_collections" TO musikpro_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "library_collections" TO musikpro_service;

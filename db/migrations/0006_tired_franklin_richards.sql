CREATE TABLE "occasions" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"emoji" text DEFAULT '🎉' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "occasions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE INDEX "occasions_active_order_idx" ON "occasions" USING btree ("active","sort_order");
--> statement-breakpoint
INSERT INTO "occasions" ("id", "name", "slug", "description", "emoji", "active", "sort_order") VALUES
	('default-birthday', 'Anniversaire', 'anniversaire', 'Célébrer une naissance et les moments partagés.', '🎂', true, 10),
	('default-love', 'Amour', 'amour', 'Déclarer ses sentiments et raconter une histoire à deux.', '💕', true, 20),
	('default-graduation', 'Graduation', 'graduation', 'Marquer une réussite scolaire ou universitaire.', '🎓', true, 30),
	('default-party', 'Fête', 'fete', 'Créer une chanson joyeuse pour un moment festif.', '🎉', true, 40),
	('default-breakup', 'Séparation', 'separation', 'Mettre en musique une rupture ou un nouveau départ.', '💔', true, 50),
	('default-gratitude', 'Gratitude', 'gratitude', 'Dire merci avec des mots personnels et sincères.', '🙏', true, 60),
	('default-serenity', 'Sérénité', 'serenite', 'Créer une chanson calme, douce et apaisante.', '🌙', true, 70),
	('default-motivation', 'Motivation', 'motivation', 'Donner de l’élan, du courage et de l’énergie.', '🔥', true, 80)
ON CONFLICT ("slug") DO NOTHING;
--> statement-breakpoint
GRANT SELECT ON TABLE "occasions" TO musikpro_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "occasions" TO musikpro_service;

CREATE TABLE "recipient_relations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "recipient_relations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE INDEX "recipient_relations_active_order_idx" ON "recipient_relations" USING btree ("active","sort_order");
--> statement-breakpoint
INSERT INTO "recipient_relations" ("id", "name", "slug", "active", "sort_order") VALUES
	('default-wife', 'Ma femme', 'ma-femme', true, 10),
	('default-husband', 'Mon mari', 'mon-mari', true, 20),
	('default-girlfriend', 'Ma copine', 'ma-copine', true, 30),
	('default-boyfriend', 'Mon copain', 'mon-copain', true, 40),
	('default-mother', 'Ma mère', 'ma-mere', true, 50),
	('default-father', 'Mon père', 'mon-pere', true, 60),
	('default-uncle', 'Mon oncle', 'mon-oncle', true, 70),
	('default-aunt', 'Ma tante', 'ma-tante', true, 80),
	('default-children', 'Mes enfants', 'mes-enfants', true, 90),
	('default-brother', 'Mon frère', 'mon-frere', true, 100),
	('default-sister', 'Ma sœur', 'ma-soeur', true, 110),
	('default-friend-m', 'Un ami', 'un-ami', true, 120),
	('default-friend-f', 'Une amie', 'une-amie', true, 130),
	('default-self', 'Pour moi', 'pour-moi', true, 140),
	('default-special', 'Une personne qui compte', 'une-personne-qui-compte', true, 150)
ON CONFLICT ("slug") DO NOTHING;
--> statement-breakpoint
GRANT SELECT ON TABLE "recipient_relations" TO musikpro_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "recipient_relations" TO musikpro_service;

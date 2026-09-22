CREATE TABLE "languages" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"native_name" text NOT NULL,
	"flag" text DEFAULT '🌍' NOT NULL,
	"interface_enabled" boolean DEFAULT false NOT NULL,
	"lyrics_enabled" boolean DEFAULT true NOT NULL,
	"interface_order" integer DEFAULT 100 NOT NULL,
	"lyrics_order" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "languages_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE INDEX "languages_interface_order_idx" ON "languages" USING btree ("interface_enabled","interface_order");
--> statement-breakpoint
CREATE INDEX "languages_lyrics_order_idx" ON "languages" USING btree ("lyrics_enabled","lyrics_order");
--> statement-breakpoint
INSERT INTO "languages" ("id", "code", "name", "native_name", "flag", "interface_enabled", "lyrics_enabled", "interface_order", "lyrics_order") VALUES
  ('language-fr', 'fr', 'Français', 'Français', '🇫🇷', true, true, 10, 10),
  ('language-en', 'en', 'Anglais', 'English', '🇬🇧', true, true, 20, 20),
  ('language-es', 'es', 'Espagnol', 'Español', '🇪🇸', true, true, 30, 30),
  ('language-pt', 'pt', 'Portugais', 'Português', '🇵🇹', true, true, 40, 40)
ON CONFLICT ("code") DO NOTHING;
--> statement-breakpoint
GRANT SELECT ON TABLE "languages" TO musikpro_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "languages" TO musikpro_service;

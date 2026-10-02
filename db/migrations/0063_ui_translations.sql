CREATE TABLE IF NOT EXISTS "ui_translations" (
	"locale" text NOT NULL,
	"source_text" text NOT NULL,
	"translation" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ui_translations_locale_source_pk" PRIMARY KEY ("locale","source_text")
);
--> statement-breakpoint
GRANT SELECT ON TABLE "ui_translations" TO musikpro_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "ui_translations" TO musikpro_service;

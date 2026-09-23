CREATE TABLE "payment_bypass_settings" (
	"id" text PRIMARY KEY DEFAULT 'global' NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"enabled_by" text,
	"enabled_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payment_bypass_settings" ADD CONSTRAINT "payment_bypass_settings_enabled_by_user_id_fk" FOREIGN KEY ("enabled_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
INSERT INTO "payment_bypass_settings" ("id", "enabled")
VALUES ('global', false)
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
GRANT SELECT ON TABLE "payment_bypass_settings" TO musikpro_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON TABLE "payment_bypass_settings" TO musikpro_service;

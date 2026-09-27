CREATE TABLE "trending_settings" (
	"id" text PRIMARY KEY DEFAULT 'global' NOT NULL,
	"mode" text DEFAULT 'auto' NOT NULL,
	"count" integer DEFAULT 3 NOT NULL,
	"manual_selection" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_by" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "trending_settings" ADD CONSTRAINT "trending_settings_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
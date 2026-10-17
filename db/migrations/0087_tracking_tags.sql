CREATE TABLE IF NOT EXISTS "tracking_tags" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"placement" text DEFAULT 'landing' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tracking_tags_placement_check" CHECK ("tracking_tags"."placement" in ('landing', 'dashboard', 'both'))
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "tracking_tags" ADD CONSTRAINT "tracking_tags_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
GRANT SELECT ON TABLE "tracking_tags" TO musikpro_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "tracking_tags" TO musikpro_service;

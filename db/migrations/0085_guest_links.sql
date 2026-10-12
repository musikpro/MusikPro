CREATE TABLE IF NOT EXISTS "guest_links" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"label" text NOT NULL,
	"destination" text DEFAULT 'create' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_by" text,
	"deleted_by" text,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "guest_links_slug_unique" UNIQUE("slug"),
	CONSTRAINT "guest_links_destination_check" CHECK ("guest_links"."destination" in ('create', 'dashboard'))
);
--> statement-breakpoint
ALTER TABLE "trash_settings" ADD COLUMN IF NOT EXISTS "guest_links_retention_days" integer DEFAULT 30 NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "guest_links" ADD CONSTRAINT "guest_links_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "guest_links_deleted_idx" ON "guest_links" USING btree ("deleted_at");
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "guest_links" TO musikpro_service;

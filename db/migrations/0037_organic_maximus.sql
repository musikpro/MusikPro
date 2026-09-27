CREATE TABLE "mobile_store_links" (
	"id" text PRIMARY KEY DEFAULT 'global' NOT NULL,
	"google_play_url" text,
	"app_store_url" text,
	"updated_by" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mobile_store_links" ADD CONSTRAINT "mobile_store_links_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
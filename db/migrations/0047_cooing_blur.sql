CREATE TABLE "landing_song_features" (
	"id" text PRIMARY KEY NOT NULL,
	"section" text NOT NULL,
	"song_group_id" text NOT NULL,
	"cover_url_override" text,
	"sort_order" integer DEFAULT 100 NOT NULL,
	"updated_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "landing_song_features" ADD CONSTRAINT "landing_song_features_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "landing_song_features_section_order_idx" ON "landing_song_features" USING btree ("section","sort_order");
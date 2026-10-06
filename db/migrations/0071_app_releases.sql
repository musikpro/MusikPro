CREATE TABLE IF NOT EXISTS "app_releases" (
	"id" text PRIMARY KEY NOT NULL,
	"platform" text NOT NULL,
	"version" text NOT NULL,
	"build" integer NOT NULL,
	"file_name" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"sha256" text NOT NULL,
	"blob_pathname" text NOT NULL,
	"notes" text,
	"published" boolean DEFAULT false NOT NULL,
	"downloads" integer DEFAULT 0 NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"published_at" timestamp
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "app_releases" ADD CONSTRAINT "app_releases_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "app_releases_platform_build_idx" ON "app_releases" USING btree ("platform","build");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "app_releases_one_published_idx" ON "app_releases" USING btree ("platform") WHERE "app_releases"."published";
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "app_releases" TO musikpro_service;
--> statement-breakpoint
GRANT SELECT ON TABLE "app_releases" TO musikpro_runtime;

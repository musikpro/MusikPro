CREATE TABLE IF NOT EXISTS "replicate_model_versions" (
	"version" text PRIMARY KEY NOT NULL,
	"model" text DEFAULT 'fishaudio/ace-step-1.5' NOT NULL,
	"status" text DEFAULT 'detected' NOT NULL,
	"compatibility" text DEFAULT 'unknown' NOT NULL,
	"mp3_validated" boolean DEFAULT false NOT NULL,
	"schema_hash" text,
	"diff" jsonb,
	"checks" jsonb,
	"probe_status" text DEFAULT 'none' NOT NULL,
	"probe_prediction_id" text,
	"probe_error" text,
	"source_created_at" timestamp,
	"detected_at" timestamp DEFAULT now() NOT NULL,
	"last_checked_at" timestamp DEFAULT now() NOT NULL,
	"tested_at" timestamp,
	"approved_by" text,
	"approved_at" timestamp,
	"activated_by" text,
	"activated_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "replicate_model_version_events" (
	"id" text PRIMARY KEY NOT NULL,
	"version" text NOT NULL,
	"event" text NOT NULL,
	"actor_id" text,
	"previous_version" text,
	"schema_hash" text,
	"result" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "replicate_model_versions" ADD CONSTRAINT "replicate_model_versions_approved_by_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "replicate_model_versions" ADD CONSTRAINT "replicate_model_versions_activated_by_user_id_fk" FOREIGN KEY ("activated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "replicate_model_version_events" ADD CONSTRAINT "replicate_model_version_events_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "replicate_model_versions_detected_idx" ON "replicate_model_versions" USING btree ("detected_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "replicate_model_version_events_version_idx" ON "replicate_model_version_events" USING btree ("version","created_at");
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "replicate_model_versions" TO musikpro_service;
--> statement-breakpoint
GRANT SELECT ON TABLE "replicate_model_versions" TO musikpro_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT ON TABLE "replicate_model_version_events" TO musikpro_service;
--> statement-breakpoint
GRANT SELECT ON TABLE "replicate_model_version_events" TO musikpro_runtime;

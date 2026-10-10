CREATE TABLE IF NOT EXISTS "payment_profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"phone_local" text NOT NULL,
	"phone_country" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "payment_profiles" ADD CONSTRAINT "payment_profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "payment_profiles" TO musikpro_service;

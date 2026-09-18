ALTER TABLE "invitation" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "active_team_id" text;--> statement-breakpoint
ALTER TABLE "team" ADD COLUMN "member_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "team_member" ADD COLUMN "membership_key" text;--> statement-breakpoint
ALTER TABLE "two_factor" ADD COLUMN "verified" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "two_factor" ADD COLUMN "failed_verification_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "two_factor" ADD COLUMN "locked_until" timestamp;--> statement-breakpoint
ALTER TABLE "team_member" ADD CONSTRAINT "team_member_membership_key_unique" UNIQUE("membership_key");--> statement-breakpoint
UPDATE "team" SET "member_count" = (SELECT count(*)::integer FROM "team_member" WHERE "team_member"."team_id" = "team"."id");

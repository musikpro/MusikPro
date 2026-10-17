ALTER TABLE "tracking_tags" DROP CONSTRAINT IF EXISTS "tracking_tags_placement_check";
--> statement-breakpoint
ALTER TABLE "tracking_tags" ADD CONSTRAINT "tracking_tags_placement_check" CHECK ("tracking_tags"."placement" in ('landing', 'dashboard', 'both', 'all'));

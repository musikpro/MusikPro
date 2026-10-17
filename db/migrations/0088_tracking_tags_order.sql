ALTER TABLE "tracking_tags" ADD COLUMN IF NOT EXISTS "sort_order" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE "tracking_tags" AS t SET "sort_order" = ranked.rn * 10
FROM (SELECT "id", row_number() OVER (ORDER BY "created_at", "id") AS rn FROM "tracking_tags") AS ranked
WHERE t."id" = ranked."id" AND t."sort_order" = 0;

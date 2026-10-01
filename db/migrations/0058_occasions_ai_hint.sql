ALTER TABLE "occasions" ADD COLUMN IF NOT EXISTS "ai_hint" text DEFAULT '' NOT NULL;
--> statement-breakpoint
UPDATE "occasions" SET "ai_hint" = 'birthday celebration, joyful, warm, heartfelt tribute' WHERE "slug" = 'anniversaire' AND "ai_hint" = '';
--> statement-breakpoint
UPDATE "occasions" SET "ai_hint" = 'love song, romantic, tender, heartfelt declaration' WHERE "slug" = 'amour' AND "ai_hint" = '';
--> statement-breakpoint
UPDATE "occasions" SET "ai_hint" = 'graduation celebration, proud, hopeful, triumphant achievement' WHERE "slug" = 'graduation' AND "ai_hint" = '';
--> statement-breakpoint
UPDATE "occasions" SET "ai_hint" = 'party celebration, festive, upbeat, danceable' WHERE "slug" = 'fete' AND "ai_hint" = '';
--> statement-breakpoint
UPDATE "occasions" SET "ai_hint" = 'breakup, heartbreak, bittersweet, emotional, moving on' WHERE "slug" = 'separation' AND "ai_hint" = '';
--> statement-breakpoint
UPDATE "occasions" SET "ai_hint" = 'thank-you song, grateful, sincere, warm and uplifting' WHERE "slug" = 'gratitude' AND "ai_hint" = '';
--> statement-breakpoint
UPDATE "occasions" SET "ai_hint" = 'serene, calm, soothing, peaceful, gentle' WHERE "slug" = 'serenite' AND "ai_hint" = '';
--> statement-breakpoint
UPDATE "occasions" SET "ai_hint" = 'motivational anthem, empowering, determined, uplifting energy' WHERE "slug" = 'motivation' AND "ai_hint" = '';
--> statement-breakpoint
UPDATE "occasions" SET "ai_hint" = 'worship and prayer, spiritual, reverent, uplifting, inspirational' WHERE "slug" = 'priere-culte' AND "ai_hint" = '';
--> statement-breakpoint
UPDATE "occasions" SET "ai_hint" = 'advertising jingle, catchy, brand promotion, punchy, memorable hook' WHERE "slug" = 'spot-publicitaire' AND "ai_hint" = '';

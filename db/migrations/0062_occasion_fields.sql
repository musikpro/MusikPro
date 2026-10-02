CREATE TABLE IF NOT EXISTS "occasion_fields" (
	"id" text PRIMARY KEY NOT NULL,
	"occasion_id" text NOT NULL REFERENCES "occasions"("id") ON DELETE CASCADE,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"help_text" text DEFAULT '' NOT NULL,
	"icon" text DEFAULT '' NOT NULL,
	"placeholder" text DEFAULT '' NOT NULL,
	"type" text NOT NULL,
	"options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	"ai_hint" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 100 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"translations" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "occasion_fields_occasion_key_unique" ON "occasion_fields" USING btree ("occasion_id","key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "occasion_fields_occasion_order_idx" ON "occasion_fields" USING btree ("occasion_id","active","sort_order");
--> statement-breakpoint
ALTER TABLE "occasions" ADD COLUMN IF NOT EXISTS "show_recipient" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "occasions" ADD COLUMN IF NOT EXISTS "show_sender" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "occasions" ADD COLUMN IF NOT EXISTS "title_field_id" text;
--> statement-breakpoint
GRANT SELECT ON TABLE "occasion_fields" TO musikpro_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "occasion_fields" TO musikpro_service;
--> statement-breakpoint
INSERT INTO "occasions" ("id", "name", "slug", "description", "emoji", "ai_hint", "active", "sort_order") VALUES
	('default-sport', 'Sport', 'sport', 'Encourager un athlète, une équipe ou une victoire.', '🏆', 'sports anthem, energetic, motivating, stadium chant', true, 90),
	('default-priere-culte', 'Prière / culte', 'priere-culte', 'Une chanson de prière, de louange ou de recueillement.', '🙏', 'worship and prayer, spiritual, reverent, uplifting', true, 100),
	('default-spot-publicitaire', 'Spot publicitaire', 'spot-publicitaire', 'Un jingle pour présenter un produit, une marque ou un événement.', '📣', 'advertising jingle, catchy, brand promotion, upbeat', true, 110)
ON CONFLICT ("slug") DO NOTHING;
--> statement-breakpoint
INSERT INTO "occasion_fields" ("id", "occasion_id", "key", "label", "help_text", "icon", "placeholder", "type", "options", "config", "required", "ai_hint", "sort_order")
SELECT 'seed-' || v.slug || '-' || v.key, o."id", v.key, v.label, v.help_text, v.icon, v.placeholder, v.type, v.options::jsonb, v.config::jsonb, v.required, v.ai_hint, v.sort_order
FROM (VALUES
	('anniversaire', 'birth_day', 'Jour de naissance', '', '📅', 'Ex: 15', 'number', '[]', '{"min":1,"max":31}', false, 'Mention the birthday day as part of the celebration, naturally, without stating the full date.', 10),
	('anniversaire', 'birth_month', 'Mois de naissance', '', '🗓️', '', 'select', '[{"label":"Janvier","emoji":"❄️"},{"label":"Février","emoji":"💝"},{"label":"Mars","emoji":"🌸"},{"label":"Avril","emoji":"🌷"},{"label":"Mai","emoji":"🌺"},{"label":"Juin","emoji":"☀️"},{"label":"Juillet","emoji":"🌴"},{"label":"Août","emoji":"🏖️"},{"label":"Sept","emoji":"🍂"},{"label":"Octobre","emoji":"🎃"},{"label":"Nov","emoji":"🍁"},{"label":"Déc","emoji":"🎄"}]', '{"display":"tiles"}', false, 'Evoke the birth month and its season in a warm, celebratory way.', 20),
	('anniversaire', 'age', 'Âge fêté', 'Facultatif', '🎈', 'Ex: 30', 'number', '[]', '{"min":0,"max":120}', false, 'Celebrate the milestone age naturally; never joke about getting old.', 30),
	('anniversaire', 'passion', 'Passion ou trait de personnalité', '', '⭐', 'Ex: passionné de football', 'short_text', '[]', '{"maxLength":100}', false, 'Weave this passion or trait into the verses as a compliment.', 40),
	('amour', 'nickname', 'Surnom affectueux', '', '💞', 'Ex: Mon cœur', 'short_text', '[]', '{"maxLength":60}', false, 'Use this nickname tenderly in the lyrics.', 10),
	('amour', 'meeting', 'Comment vous vous êtes rencontrés', '', '💬', 'Raconte en quelques mots', 'long_text', '[]', '{"maxLength":300}', false, 'Reference the story of how they met as a key memory.', 20),
	('amour', 'bond', 'Ce qui vous unit', '', '🤍', 'Ex: le rire, les voyages…', 'long_text', '[]', '{"maxLength":300}', false, 'Express what makes this couple special.', 30),
	('graduation', 'degree', 'Diplôme obtenu', '', '🎓', 'Ex: Master en gestion', 'short_text', '[]', '{"maxLength":100}', false, 'Celebrate this specific achievement.', 10),
	('graduation', 'school', 'Établissement', '', '🏫', 'Ex: Université de Cocody', 'short_text', '[]', '{"maxLength":100}', false, 'Mention the school once, with pride.', 20),
	('graduation', 'next_step', 'Prochain projet', '', '🚀', 'Ex: lancer mon entreprise', 'short_text', '[]', '{"maxLength":100}', false, 'Look forward to this next step with hope.', 30),
	('fete', 'party_type', 'Type de fête', '', '🎉', '', 'select', '[{"label":"Mariage","emoji":"💍"},{"label":"Baptême","emoji":"👶"},{"label":"Fiançailles","emoji":"🥂"},{"label":"Réunion de famille","emoji":"👨‍👩‍👧‍👦"},{"label":"Soirée","emoji":"🎊"},{"label":"Autre","emoji":"✨"}]', '{"display":"tiles"}', false, 'Adapt the festive tone to this kind of party.', 10),
	('fete', 'event_name', 'Nom ou lieu de l''événement', '', '📍', 'Ex: Chez Tonton Moussa', 'short_text', '[]', '{"maxLength":100}', false, 'Mention the event name or place once.', 20),
	('separation', 'feeling', 'Ce que tu veux exprimer', '', '💔', '', 'select', '[{"label":"Tourner la page","emoji":"🌅"},{"label":"Tristesse","emoji":"😢"},{"label":"Pardon","emoji":"🕊️"},{"label":"Force","emoji":"💪"}]', '{"display":"tiles"}', false, 'Make this the emotional core of the song.', 10),
	('separation', 'memory', 'Un souvenir à évoquer', '', '🕯️', 'Un moment, un lieu, une phrase…', 'long_text', '[]', '{"maxLength":300}', false, 'Evoke this memory gently, without blame.', 20),
	('gratitude', 'thanks', 'Ce pour quoi tu remercies', '', '🙏', 'Ex: ton soutien quand j''en avais besoin', 'long_text', '[]', '{"maxLength":300}', false, 'Make this the central reason for the thanks.', 10),
	('gratitude', 'since', 'Depuis quand cette personne t''accompagne', '', '⏳', 'Ex: depuis 10 ans', 'short_text', '[]', '{"maxLength":60}', false, 'Mention how long they have been there.', 20),
	('serenite', 'calm', 'Ce qui t''apaise', '', '🌿', 'Ex: le bruit de la pluie', 'short_text', '[]', '{"maxLength":100}', false, 'Use this as a soothing image.', 10),
	('serenite', 'moment', 'Moment de la journée', '', '🌙', '', 'select', '[{"label":"Matin","emoji":"🌅"},{"label":"Après-midi","emoji":"☀️"},{"label":"Soir","emoji":"🌇"},{"label":"Nuit","emoji":"🌙"}]', '{"display":"tiles"}', false, 'Set the song at this time of day.', 20),
	('motivation', 'goal', 'Objectif à atteindre', '', '🎯', 'Ex: finir mon marathon', 'short_text', '[]', '{"maxLength":100}', false, 'Make this goal the rallying cry.', 10),
	('motivation', 'obstacle', 'Obstacle à dépasser', '', '🧗', 'Ex: la peur d''échouer', 'short_text', '[]', '{"maxLength":100}', false, 'Show this obstacle being overcome.', 20),
	('sport', 'discipline', 'Discipline', '', '⚽', 'Ex: football, athlétisme…', 'short_text', '[]', '{"maxLength":60}', false, 'Use vocabulary of this sport.', 10),
	('sport', 'team', 'Équipe ou compétition', '', '🏆', 'Ex: Les Éléphants', 'short_text', '[]', '{"maxLength":100}', false, 'Mention the team or competition as a rallying cry.', 20),
	('sport', 'goal', 'Objectif', '', '🥇', 'Ex: gagner la finale', 'short_text', '[]', '{"maxLength":100}', false, 'Make this goal the climax of the song.', 30),
	('priere-culte', 'theme', 'Thème ou verset', '', '📖', 'Ex: Psaume 23', 'short_text', '[]', '{"maxLength":100}', false, 'Inspire the lyrics from this theme or verse, respectfully.', 10),
	('priere-culte', 'intention', 'Intention de prière', '', '🙏', 'Pour qui ou pour quoi prie-t-on ?', 'long_text', '[]', '{"maxLength":300}', false, 'Express this prayer intention with reverence.', 20),
	('spot-publicitaire', 'product_name', 'Nom du produit ou de la marque', '', '🏷️', 'Ex: Café Soleil', 'short_text', '[]', '{"maxLength":100}', true, 'Name the product or brand clearly and repeat it in the chorus.', 10),
	('spot-publicitaire', 'audience', 'Public ciblé', '', '👥', 'Ex: les jeunes urbains', 'short_text', '[]', '{"maxLength":100}', false, 'Speak directly to this audience.', 20),
	('spot-publicitaire', 'duration', 'Durée du spot', '', '⏱️', '', 'select', '[{"label":"15 s","emoji":"⏱️"},{"label":"30 s","emoji":"⏱️"},{"label":"60 s","emoji":"⏱️"}]', '{"display":"tiles"}', false, 'Keep the lyrics short and punchy to fit this spot duration.', 30),
	('spot-publicitaire', 'strengths', 'Points forts', '', '✨', 'Ce qui rend le produit unique', 'long_text', '[]', '{"maxLength":300}', false, 'Highlight these selling points in the verses.', 40),
	('spot-publicitaire', 'cta', 'Appel à l''action', '', '📣', 'Ex: Commandez dès aujourd''hui !', 'short_text', '[]', '{"maxLength":100}', false, 'End the chorus with this call to action.', 50)
) AS v(slug, key, label, help_text, icon, placeholder, type, options, config, required, ai_hint, sort_order)
JOIN "occasions" o ON o."slug" = v.slug
ON CONFLICT ("occasion_id", "key") DO NOTHING;
--> statement-breakpoint
UPDATE "occasions" SET "show_recipient" = false, "show_sender" = false, "title_field_id" = 'seed-spot-publicitaire-product_name'
WHERE "slug" = 'spot-publicitaire' AND "title_field_id" IS NULL
AND EXISTS (SELECT 1 FROM "occasion_fields" f WHERE f."id" = 'seed-spot-publicitaire-product_name');

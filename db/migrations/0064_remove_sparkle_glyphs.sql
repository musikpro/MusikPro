-- Règle générale du kit : aucun pictogramme « étincelles » (✨ ✦ ✧ 🌟 💫…) dans l'interface.
-- Corrige les valeurs déjà enregistrées par la migration 0062 et celles que l'admin ou l'IA auraient saisies.
-- Idempotente : relancée, elle ne change plus rien.
UPDATE "occasion_fields" SET "icon" = '💪'
WHERE "id" = 'seed-spot-publicitaire-strengths' AND "icon" ~ '[✨✦✧✩✪✫✬✭✮✯✰🌟💫]';
--> statement-breakpoint
UPDATE "occasion_fields" SET "icon" = ''
WHERE "icon" ~ '[✨✦✧✩✪✫✬✭✮✯✰🌟💫]';
--> statement-breakpoint
UPDATE "occasion_fields" f SET "options" = (
	SELECT COALESCE(jsonb_agg(
		CASE WHEN e.o->>'emoji' ~ '[✨✦✧✩✪✫✬✭✮✯✰🌟💫]'
			THEN jsonb_set(e.o, '{emoji}', to_jsonb(CASE WHEN e.o->>'label' = 'Autre' THEN '➕' ELSE '' END::text))
			ELSE e.o END
		ORDER BY e.ord), '[]'::jsonb)
	FROM jsonb_array_elements(f."options") WITH ORDINALITY AS e(o, ord)
)
WHERE f."options"::text ~ '[✨✦✧✩✪✫✬✭✮✯✰🌟💫]';

UPDATE "plans"
SET "features" = jsonb_set("features", '{bonus}', 'null'::jsonb)
WHERE "features"->>'bonus' IN ('1 crédit restant', 'Meilleur rapport crédits-prix', 'Pour les créateurs réguliers');

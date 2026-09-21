INSERT INTO "plans" (
  "id",
  "name",
  "description",
  "code",
  "amount",
  "currency",
  "interval",
  "active",
  "features"
) VALUES
  (
    'credits-decouverte-5',
    'Découverte',
    '2 générations, soit jusqu’à 4 versions musicales',
    'credits-5',
    1000,
    'XOF',
    'one_time',
    true,
    '{"credits":5,"generationCost":2,"popular":false,"bonus":"1 crédit restant","sortOrder":10}'::jsonb
  ),
  (
    'credits-essentiel-10',
    'Essentiel',
    '5 générations, soit jusqu’à 10 versions musicales',
    'credits-10',
    2000,
    'XOF',
    'one_time',
    true,
    '{"credits":10,"generationCost":2,"popular":false,"bonus":null,"sortOrder":20}'::jsonb
  ),
  (
    'credits-populaire-20',
    'Populaire',
    '10 générations, soit jusqu’à 20 versions musicales',
    'credits-20',
    3500,
    'XOF',
    'one_time',
    true,
    '{"credits":20,"generationCost":2,"popular":true,"bonus":"Meilleur rapport crédits-prix","sortOrder":30}'::jsonb
  ),
  (
    'credits-studio-50',
    'Studio',
    '25 générations, soit jusqu’à 50 versions musicales',
    'credits-50',
    7500,
    'XOF',
    'one_time',
    true,
    '{"credits":50,"generationCost":2,"popular":false,"bonus":"Pour les créateurs réguliers","sortOrder":40}'::jsonb
  )
ON CONFLICT ("code") DO NOTHING;

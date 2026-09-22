-- The product now exposes Chariow as its sole payment gateway. Historical
-- payments are intentionally preserved; only gateway configuration is reset.
DELETE FROM "payment_country_routes";
DELETE FROM "plan_provider_mappings";
DELETE FROM "payment_provider_configs";

INSERT INTO "payment_provider_configs" ("id", "provider", "enabled", "priority", "mode", "config")
VALUES ('payment-provider-chariow', 'chariow', false, 10, 'live', '{}'::jsonb);

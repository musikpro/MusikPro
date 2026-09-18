-- Trusted service needs business mutations and user joins, not auth credentials.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM musikpro_service;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE audit_logs, credits, payment_attempts, payment_country_routes, payment_fulfillments, payment_provider_configs, payments, plan_provider_mappings, plans, security_events, subscriptions, webhook_events TO musikpro_service;
--> statement-breakpoint
GRANT SELECT ON TABLE "user" TO musikpro_service;

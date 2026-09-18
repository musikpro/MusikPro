-- Application and trusted-service roles are deliberately distinct from the migration owner.
CREATE ROLE musikpro_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
--> statement-breakpoint
CREATE ROLE musikpro_service NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
--> statement-breakpoint
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO musikpro_runtime, musikpro_service;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO musikpro_service;
--> statement-breakpoint
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO musikpro_service;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "user", session, account, verification, organization, member, invitation, team, team_member, two_factor, "rateLimit" TO musikpro_runtime;
--> statement-breakpoint
GRANT SELECT ON TABLE plans, payment_country_routes, payment_provider_configs, plan_provider_mappings, payment_attempts, subscriptions, payments, credits, audit_logs TO musikpro_runtime;
--> statement-breakpoint

-- Africa SaaS Kit — RLS baseline (V0.8.26)
-- Applied by db/migrations/0001_runtime_rls.sql with restricted runtime/service roles.
-- The online gate `npm run security:db-check` verifies that required tables have RLS + policies.
-- Request context must set these LOCAL settings inside the current transaction when using direct RLS reads:
--   SET LOCAL app.user_id = '<authenticated-user-id>';
--   SET LOCAL app.organization_id = '<authorized-organization-id>';

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

DROP POLICY IF EXISTS subscriptions_tenant_isolation ON subscriptions;
--> statement-breakpoint
CREATE POLICY subscriptions_tenant_isolation ON subscriptions
  TO musikpro_runtime
  USING (
    user_id = nullif(current_setting('app.user_id', true), '')
    OR organization_id = nullif(current_setting('app.organization_id', true), '')
  )
  WITH CHECK (
    user_id = nullif(current_setting('app.user_id', true), '')
    OR organization_id = nullif(current_setting('app.organization_id', true), '')
  );
--> statement-breakpoint

DROP POLICY IF EXISTS payments_tenant_isolation ON payments;
--> statement-breakpoint
CREATE POLICY payments_tenant_isolation ON payments
  TO musikpro_runtime
  USING (
    user_id = nullif(current_setting('app.user_id', true), '')
    OR organization_id = nullif(current_setting('app.organization_id', true), '')
  )
  WITH CHECK (
    user_id = nullif(current_setting('app.user_id', true), '')
    OR organization_id = nullif(current_setting('app.organization_id', true), '')
  );
--> statement-breakpoint

DROP POLICY IF EXISTS credits_owner_isolation ON credits;
--> statement-breakpoint
CREATE POLICY credits_owner_isolation ON credits
  TO musikpro_runtime
  USING (user_id = nullif(current_setting('app.user_id', true), ''))
  WITH CHECK (user_id = nullif(current_setting('app.user_id', true), ''));
--> statement-breakpoint

DROP POLICY IF EXISTS audit_logs_tenant_read ON audit_logs;
--> statement-breakpoint
CREATE POLICY audit_logs_tenant_read ON audit_logs
  FOR SELECT TO musikpro_runtime
  USING (organization_id = nullif(current_setting('app.organization_id', true), ''));
--> statement-breakpoint

CREATE POLICY subscriptions_server_access ON subscriptions TO musikpro_service USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY payments_server_access ON payments TO musikpro_service USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY credits_server_access ON credits TO musikpro_service USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY audit_logs_server_access ON audit_logs TO musikpro_service USING (true) WITH CHECK (true);
--> statement-breakpoint

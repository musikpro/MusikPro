-- Africa SaaS Kit — RLS baseline (V0.8.26)
-- Applied by db/migrations/0001_runtime_rls.sql with restricted runtime/service roles.
-- The online gate `npm run security:db-check` verifies that required tables have RLS + policies.
-- Request context must set these LOCAL settings inside the current transaction when using direct RLS reads:
--   SET LOCAL app.user_id = '<authenticated-user-id>';
--   SET LOCAL app.organization_id = '<authorized-organization-id>';

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subscriptions_tenant_isolation ON subscriptions;
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

DROP POLICY IF EXISTS payments_tenant_isolation ON payments;
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

DROP POLICY IF EXISTS credits_owner_isolation ON credits;
CREATE POLICY credits_owner_isolation ON credits
  TO musikpro_runtime
  USING (user_id = nullif(current_setting('app.user_id', true), ''))
  WITH CHECK (user_id = nullif(current_setting('app.user_id', true), ''));

DROP POLICY IF EXISTS audit_logs_tenant_read ON audit_logs;
CREATE POLICY audit_logs_tenant_read ON audit_logs
  FOR SELECT TO musikpro_runtime
  USING (organization_id = nullif(current_setting('app.organization_id', true), ''));

-- Trusted server operations use a separate, non-owner, non-BYPASSRLS role.
CREATE POLICY subscriptions_server_access ON subscriptions TO musikpro_service USING (true) WITH CHECK (true);
CREATE POLICY payments_server_access ON payments TO musikpro_service USING (true) WITH CHECK (true);
CREATE POLICY credits_server_access ON credits TO musikpro_service USING (true) WITH CHECK (true);
CREATE POLICY audit_logs_server_access ON audit_logs TO musikpro_service USING (true) WITH CHECK (true);

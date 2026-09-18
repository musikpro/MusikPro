# Security Baseline Gate — V0.8.26

This gate turns the launch checklist into a permanent delivery rule instead of a one-time manual checklist.

## Commands

- `npm run security:baseline` — offline/static guard; runs on every code verification and CI.
- `npm run security:db-check` — online Neon/Postgres check; verifies RLS + at least one policy on every RLS-required table.
- `npm run security:release` — baseline + existing security preflight + dependency audit + secret/build audit.

## Enforced rules

1. `.env.local` is explicitly gitignored and secret-like `NEXT_PUBLIC_*` variables are rejected.
2. Every API route must be classified in `config/security-routes.json` for authentication, server-side validation and rate limiting. New routes fail until classified.
3. Every Drizzle table must be classified in `config/security-rls.json`. New tables fail until classified.
4. Tenant/user business tables must be present in `db/security/rls-baseline.sql` with `ENABLE ROW LEVEL SECURITY` and a policy.
5. `proxy.ts` must keep dashboard/admin authentication protection.
6. Production email verification must remain wired in Better Auth.
7. Better Auth rate limiting and the application fail-closed distributed rate limiter must remain present.
8. Production verification must keep `npm audit` in the release path.

## Important RLS deployment rule

Do **not** blindly enable RLS on every Better Auth/internal table using the owner connection. RLS is meaningful only with a least-privilege runtime role (or carefully designed FORCE RLS policies). Framework-owned/global/service-only tables are therefore explicit, reviewed exemptions. User/tenant business tables are RLS-required by default.

When adding a new table, the baseline deliberately fails. Classify it as `required` or `exempt` with a concrete reason. Prefer `required` for any table that contains user, organization, tenant, private or financial data.

Before production, apply/review `db/security/rls-baseline.sql` using the migration role, configure a least-privilege runtime DB role, then run:

```bash
npm run security:db-check
npm run verify:production
```

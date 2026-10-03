#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (rel) => (fs.existsSync(path.join(root, rel)) ? fs.readFileSync(path.join(root, rel), "utf8") : "");
const checks = [];
const add = (id, ok, detail) => checks.push({ id, ok, detail });

const auth = read("lib/auth/index.ts");
const session = read("lib/auth/session.ts");
const permissions = read("lib/auth/permissions.ts");
const orgAccess = read("lib/auth/organization-access.ts");
const authSchema = read("db/schema/auth.generated.ts");
const schema = read("db/schema/index.ts");
const rls = read("db/security/rls-baseline.sql");
const adminLayout = read("app/admin/layout.tsx");

add(
  "rbac-global",
  /admin\(\{/.test(auth) &&
    /requireAdmin/.test(session) &&
    /hasAppRole/.test(permissions) &&
    /requireAdmin/.test(adminLayout),
  "Rôle admin global protégé côté serveur",
);
add(
  "rbac-org",
  /OrganizationRole/.test(permissions) &&
    /hasOrganizationRole/.test(permissions) &&
    /requireOrganizationAccess/.test(orgAccess),
  "Rôles owner/admin/member centralisés pour les organisations",
);
add("org-plugin", /organization\(\{/.test(auth), "Plugin Better Auth Organization activé");
add(
  "org-schema",
  /pgTable\(\s*"organization"/.test(authSchema) &&
    /pgTable\(\s*"member"/.test(authSchema) &&
    /organizationId/.test(authSchema),
  "Tables organisation/membership présentes",
);
add(
  "tenant-columns",
  /organizationId:/.test(schema) && /subscriptions/.test(schema) && /payments/.test(schema) && /auditLogs/.test(schema),
  "Données métier critiques disposent d'un scope organisation",
);
add(
  "tenant-membership",
  /eq\(member\.organizationId, organizationId\)/.test(orgAccess) && /eq\(member\.userId, userId\)/.test(orgAccess),
  "Le contexte organisation vérifie le membership utilisateur",
);
add(
  "tenant-rls",
  /app\.organization_id/.test(rls) && /tenant_isolation/.test(rls) && /audit_logs_tenant_read/.test(rls),
  "Baseline RLS d'isolation tenant présente",
);

const failed = checks.filter((x) => !x.ok);
for (const item of checks) console.log(`${item.ok ? "PASS" : "FAIL"} ${item.id}: ${item.detail}`);
if (failed.length) {
  console.error(`Access control check: FAIL — ${failed.length}/${checks.length} contrôle(s) en échec.`);
  process.exit(1);
}
console.log(`Access control check: PASS — ${checks.length}/${checks.length} contrôles RBAC + multi-tenant.`);

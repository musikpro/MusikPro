#!/usr/bin/env node
import fs from "node:fs";
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL;
if (!url) {
  console.error("Security DB check: FAIL — DATABASE_URL_DIRECT or DATABASE_URL is required.");
  process.exit(1);
}
const manifest = JSON.parse(fs.readFileSync("config/security-rls.json", "utf8"));
const required = Object.keys(manifest.required || {});
const conditional = Object.keys(manifest.conditional || {});
const inspected = [...required, ...conditional];
const sql = neon(url);
const rows = await sql`
  SELECT c.relname AS table_name,
         c.relrowsecurity AS rls_enabled,
         EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname = n.nspname AND p.tablename = c.relname) AS has_policy
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname = ANY(${inspected})
`;
const byName = new Map(rows.map((r) => [r.table_name, r]));
const errors = [];
for (const table of inspected) {
  const row = byName.get(table);
  if (!row && conditional.includes(table)) continue;
  if (!row) errors.push(`${table}: table missing from public schema`);
  else {
    if (!row.rls_enabled) errors.push(`${table}: RLS is not enabled`);
    if (!row.has_policy) errors.push(`${table}: no RLS policy found`);
  }
}
if (errors.length) {
  console.error("Security DB check: FAIL");
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log(
  `Security DB check: PASS — RLS verified on ${required.length} required table(s); ${conditional.length} conditional table(s) checked when present.`,
);

import fs from "node:fs";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";
import { z } from "zod";

nextEnv.loadEnvConfig(process.cwd());
const mode = z
  .enum(["--migrate", "--provision", "--test"])
  .parse(process.argv[2]);
const urlSchema = z
  .string()
  .url()
  .refine((v) => /^postgres(?:ql)?:\/\//.test(v));
const appUrl = urlSchema.parse(process.env.DATABASE_URL);
const direct = new URL(process.env.DATABASE_URL_DIRECT || appUrl);
direct.hostname = direct.hostname.replace(/-pooler(?=\.)/, "");
const migrationUrl = urlSchema.parse(direct.toString());

try {
  if (mode === "--migrate") {
    const result = spawnSync("npm", ["run", "db:migrate"], {
      env: { ...process.env, DATABASE_URL_DIRECT: migrationUrl },
      encoding: "utf8",
    });
    // Migration failures can include connection information; never print raw output.
    if (result.status !== 0) throw new Error("migration-failed");
    console.log("Migration RLS : PASS");
  } else if (mode === "--provision") {
    if (new URL(appUrl).username === "musikpro_runtime")
      throw new Error("already-provisioned");
    const sql = neon(migrationUrl);
    const updates = { DATABASE_URL_DIRECT: migrationUrl };
    for (const [role, key] of [
      ["musikpro_runtime", "DATABASE_URL"],
      ["musikpro_service", "DATABASE_SERVICE_URL"],
    ]) {
      const password = crypto.randomBytes(48).toString("hex");
      // Both the identifier and hex literal are generated here, never user input.
      await sql.query(`ALTER ROLE ${role} LOGIN PASSWORD '${password}'`);
      const url = new URL(appUrl);
      url.username = role;
      url.password = password;
      const connection = neon(url.toString());
      const [record] = await connection`SELECT current_user AS role`;
      if (record.role !== role) throw new Error("role-connection-failed");
      updates[key] = url.toString();
    }
    let content = fs.readFileSync(".env.local", "utf8");
    for (const [key, value] of Object.entries(updates)) {
      const pattern = new RegExp(`^${key}=[^\\r\\n]*`, "m");
      content = pattern.test(content)
        ? content.replace(pattern, () => `${key}=${value}`)
        : `${content.trimEnd()}\n${key}=${value}\n`;
    }
    fs.writeFileSync(".env.local", content, { mode: 0o600 });
    fs.chmodSync(".env.local", 0o600);
    console.log(
      "Connexions runtime/service : PASS ; credentials stockés uniquement dans .env.local",
    );
  } else {
    const runtime = neon(appUrl);
    const service = neon(urlSchema.parse(process.env.DATABASE_SERVICE_URL));
    const [role] =
      await runtime`SELECT rolname, rolsuper, rolbypassrls, rolcreaterole, rolcreatedb FROM pg_roles WHERE rolname=current_user`;
    if (
      role.rolname !== "musikpro_runtime" ||
      role.rolsuper ||
      role.rolbypassrls ||
      role.rolcreaterole ||
      role.rolcreatedb
    )
      throw new Error("unsafe-runtime-role");
    const owns =
      await runtime`SELECT count(*)::int AS n FROM pg_tables WHERE schemaname='public' AND tableowner=current_user`;
    if (owns[0].n !== 0) throw new Error("runtime-owns-tables");
    const prefix = `rls-test-${crypto.randomUUID()}`;
    const ids = [`${prefix}-a`, `${prefix}-b`];
    try {
      for (const id of ids) {
        await runtime`INSERT INTO "user" (id,name,email) VALUES (${id},'RLS verification',${id + "@example.invalid"})`;
        await service`INSERT INTO credits (id,user_id,balance) VALUES (${id},${id},1)`;
      }
      const none =
        await runtime`SELECT user_id FROM credits WHERE user_id=ANY(${ids})`;
      if (none.length) throw new Error("context-free-read-leak");
      for (const id of ids) {
        const results = await runtime.transaction([
          runtime`SELECT set_config('app.user_id', ${id}, true), set_config('app.organization_id','',true)`,
          runtime`SELECT user_id FROM credits WHERE user_id=ANY(${ids})`,
        ]);
        if (results[1].length !== 1 || results[1][0].user_id !== id)
          throw new Error("cross-user-read-leak");
      }
      const leaked =
        await runtime`SELECT user_id FROM credits WHERE user_id=ANY(${ids})`;
      if (leaked.length) throw new Error("pooled-context-leak");
      let denied = false;
      try {
        await runtime`UPDATE credits SET balance=2 WHERE user_id=${ids[0]}`;
      } catch (e) {
        denied = e.code === "42501";
      }
      if (!denied) throw new Error("runtime-write-not-denied");
      const ddl =
        await runtime`SELECT has_schema_privilege(current_user,'public','CREATE') AS allowed`;
      if (ddl[0].allowed) throw new Error("runtime-ddl-allowed");
      console.log(
        "RLS réelle : PASS — isolation A/B, refus sans contexte, contexte non persistant, mutation et DDL interdits",
      );
    } finally {
      await service`DELETE FROM credits WHERE user_id=ANY(${ids})`;
      await runtime`DELETE FROM "user" WHERE id=ANY(${ids})`;
    }
  }
} catch (error) {
  console.error(
    `Neon runtime setup : FAIL (${error.code || "operation-failed"}). Aucun identifiant affiché.`,
  );
  process.exitCode = 1;
}

#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const action = process.argv[2];
if (!["generate", "migrate"].includes(action)) {
  console.error("Usage: node scripts/prisma-clients.mjs generate|migrate");
  process.exit(2);
}

function loadEnvFile(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) return {};
  const values = {};
  for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx < 1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
      value = value.slice(1, -1);
    values[key] = value;
  }
  return values;
}

const env = { ...process.env, ...loadEnvFile(".env.local") };
if (!env.DATABASE_URL) {
  console.error("DATABASE_URL manque. Configure Neon dans .env.local avant le CRUD Clients.");
  process.exit(1);
}

const bin = process.platform === "win32" ? "prisma.cmd" : "prisma";
const args = action === "generate" ? ["generate"] : ["migrate", "deploy"];
const result = spawnSync(bin, args, { cwd: root, env, stdio: "inherit", shell: false });
if (result.error?.code === "ENOENT") {
  console.error("Prisma CLI introuvable. Exécute d’abord npm install.");
  process.exit(1);
}
process.exit(result.status ?? 1);

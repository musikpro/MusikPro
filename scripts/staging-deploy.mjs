#!/usr/bin/env node
import { spawnSync } from "node:child_process";
console.log("Creating a Vercel Preview/Staging deployment (never Production)...");
console.log(
  "Preview uses Vercel Preview-scoped environment variables. Keep staging data/secrets isolated from Production.",
);
const r = spawnSync(process.platform === "win32" ? "npx.cmd" : "npx", ["vercel"], { stdio: "inherit" });
if (r.error) {
  console.error(
    "Vercel CLI unavailable. Install/login to Vercel CLI or push a non-production Git branch to create a Preview deployment.",
  );
  process.exit(1);
}
process.exit(r.status ?? 1);

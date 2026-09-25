#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const online = process.argv.includes("--online");
const cfg = (() => {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, "africa-saas.config.json"), "utf8"));
  } catch {
    return null;
  }
})();
const env = {};
const envPath = path.join(root, ".env.local");
if (fs.existsSync(envPath))
  for (const raw of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 1) continue;
    env[line.slice(0, i).trim()] = line
      .slice(i + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");
  }
const url = (env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_REST_URL || "").trim();
const token = (env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "").trim();
if (cfg?.upstashEnabled === false && !url && !token) {
  console.log("Upstash check: SKIPPED (optional / disabled)");
  process.exit(0);
}
if (!url || !token) {
  console.error("Upstash check: FAIL — REST URL/token incomplete");
  process.exit(1);
}
if (!/^https:\/\//i.test(url)) {
  console.error("Upstash check: FAIL — REST URL must use HTTPS");
  process.exit(1);
}
console.log("Upstash config: PASS — credentials present (token hidden)");
if (!online) process.exit(0);
try {
  const response = await fetch(url.replace(/\/$/, ""), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(["PING"]),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const body = await response.json();
  if (String(body?.result || "").toUpperCase() !== "PONG") throw new Error("Unexpected response");
  console.log("Upstash online: PASS — PONG");
} catch (e) {
  console.error(`Upstash online: FAIL — ${e instanceof Error ? e.message : "connection error"}`);
  process.exit(1);
}

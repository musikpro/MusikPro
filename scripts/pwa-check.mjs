#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
const root = process.cwd();
const read = (rel) => {
  try {
    return fs.readFileSync(path.join(root, rel), "utf8");
  } catch {
    return "";
  }
};
const checks = [];
const add = (id, ok, detail) => checks.push({ id, ok, detail });
const manifest = read("app/manifest.ts");
const sw = read("public/sw.js");
const layout = read("app/layout.tsx");
const nextConfig = read("next.config.ts");
add(
  "manifest",
  /display:\s*["']standalone["']/.test(manifest) && /start_url/.test(manifest),
  "Manifest PWA standalone with start_url",
);
add(
  "icons",
  ["public/icon-192.png", "public/icon-512.png", "public/icon-512-maskable.png"].every((f) =>
    fs.existsSync(path.join(root, f)),
  ),
  "PWA 192/512/maskable icons present",
);
add(
  "service-worker",
  fs.existsSync(path.join(root, "public/sw.js")) && /OFFLINE_URL/.test(sw),
  "Service worker and offline fallback present",
);
add(
  "safe-cache",
  /request\.method !== ["']GET["']/.test(sw) && /\/api\//.test(sw) && /\/dashboard/.test(sw) && /\/admin/.test(sw),
  "Mutations/private API/admin/dashboard are excluded from PWA cache",
);
add(
  "registration",
  /ServiceWorkerRegister/.test(layout) && fs.existsSync(path.join(root, "components/pwa/service-worker-register.tsx")),
  "Service worker registrar mounted in root layout",
);
add("no-static-export", !/output\s*:\s*["']export["']/.test(nextConfig), "Next.js static export is not enabled");
console.log("Africa SaaS Kit — PWA Check");
for (const c of checks) console.log(`${c.ok ? "✓" : "✗"} ${c.id}: ${c.detail}`);
const failed = checks.filter((c) => !c.ok);
if (failed.length) {
  console.error(`\n${failed.length} PWA check(s) FAIL.`);
  process.exit(1);
}
console.log("\nPWA preflight: passed.");

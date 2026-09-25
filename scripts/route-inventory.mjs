#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const appDir = path.join(root, "app");
const routes = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name === "route.ts" || entry.name === "route.js") {
      const rel = path
        .relative(appDir, full)
        .replace(/\\/g, "/")
        .replace(/\/route\.(ts|js)$/, "");
      const url = `/${rel}`.replace(/\/\(.*?\)/g, "");
      const source = fs.readFileSync(full, "utf8");
      const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"].filter((method) => {
        const direct = new RegExp(
          `export\\s+(?:async\\s+)?function\\s+${method}\\b|export\\s+const\\s+${method}\\b`,
        ).test(source);
        const destructured = new RegExp(`export\\s+const\\s+\\{[^}]*\\b${method}\\b[^}]*\\}`).test(source);
        return direct || destructured;
      });
      routes.push({ url, methods: methods.length ? methods : ["UNKNOWN"], file: path.relative(root, full) });
    }
  }
}

walk(appDir);
routes.sort((a, b) => a.url.localeCompare(b.url));
console.log(`Africa SaaS Kit — ${routes.length} Route Handler(s)`);
for (const route of routes) console.log(`${route.methods.join(",").padEnd(12)} ${route.url.padEnd(45)} ${route.file}`);

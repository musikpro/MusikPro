#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const roots = ["app", "components", "lib", "db", "scripts", "tests", "config"];
const extensions = new Set([".ts", ".tsx", ".js", ".mjs", ".json"]);
const failures = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (extensions.has(path.extname(entry.name))) check(full);
  }
}

function check(file) {
  const text = fs.readFileSync(file, "utf8");
  if (!text.endsWith("\n")) failures.push(`${file}: newline final manquant`);
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (/[ \t]+$/.test(line)) failures.push(`${file}:${index + 1}: espaces fin de ligne`);
    if (/\t/.test(line)) failures.push(`${file}:${index + 1}: tabulation détectée`);
  });
}

roots.forEach(walk);
if (failures.length) {
  console.error(failures.slice(0, 100).join("\n"));
  process.exit(1);
}
console.log("Format hygiene check: passed.");

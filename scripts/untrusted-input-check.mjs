#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const failures = [];
const zod = spawnSync(process.execPath, ["scripts/zod-validation-check.mjs"], { cwd: root, encoding: "utf8" });
if (zod.status !== 0) failures.push("le Zod Validation Gate échoue");
const walk = (dir) => fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(full) : [full];
}) : [];
const files = ["app", "components", "lib", "db"].flatMap((dir) => walk(path.join(root, dir))).filter((file) => /\.(?:ts|tsx|js|jsx)$/.test(file));
const allowedDangerousHtml = new Set(["components/seo/json-ld.tsx"]);
for (const file of files) {
  const rel = path.relative(root, file).replaceAll("\\", "/");
  const source = fs.readFileSync(file, "utf8");
  if (/\$(?:queryRawUnsafe|executeRawUnsafe)\b|\bsql\.raw\s*\(/.test(source)) failures.push(`${rel}: API SQL brute/unsafe interdite`);
  if (/\.innerHTML\s*=|insertAdjacentHTML\s*\(/.test(source)) failures.push(`${rel}: injection HTML directe interdite`);
  if (/dangerouslySetInnerHTML/.test(source) && !allowedDangerousHtml.has(rel)) failures.push(`${rel}: dangerouslySetInnerHTML non autorisé`);
}
const jsonLd = path.join(root, "components/seo/json-ld.tsx");
if (!fs.existsSync(jsonLd)) failures.push("exception JSON-LD attendue absente");
else {
  const source = fs.readFileSync(jsonLd, "utf8");
  if (!/JSON\.stringify\(data\)/.test(source) || !/replace\(\/<\/g/.test(source)) failures.push("JSON-LD: sérialisation/échappement < incomplet");
}
const upload = path.join(root, "app/api/uploads/images/route.ts");
if (fs.existsSync(upload)) {
  const source = fs.readFileSync(upload, "utf8");
  for (const marker of ["rejectOversizedRequest", "requireContentType", "safeParse", "rateLimit"]) if (!source.includes(marker)) failures.push(`upload images: garde manquante ${marker}`);
}
if (failures.length) {
  console.error("Untrusted Input / HTML Safety Gate — FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`Untrusted Input / HTML Safety Gate — PASS — Zod + ${files.length} fichier(s) runtime inspectés, SQL unsafe/HTML direct absents.`);

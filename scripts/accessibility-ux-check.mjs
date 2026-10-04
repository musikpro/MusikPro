#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const walk = (dir) => fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(full) : [full];
}) : [];
const files = ["app", "components"].flatMap((dir) => walk(path.join(root, dir))).filter((file) => /\.(?:tsx|jsx)$/.test(file));

for (const file of files) {
  const rel = path.relative(root, file).replaceAll("\\", "/");
  const source = fs.readFileSync(file, "utf8");
  const imgTags = source.match(/<img\b[^>]*>/gis) || [];
  for (const tag of imgTags) if (!/\balt\s*=/.test(tag)) failures.push(`${rel}: <img> sans alt`);
  const interactive = source.match(/<(div|span)\b[^>]*\bonClick\s*=.*?>/gis) || [];
  for (const tag of interactive) if (!/\brole\s*=/.test(tag) || !/\btabIndex\s*=/.test(tag)) failures.push(`${rel}: élément non interactif avec onClick sans role+tabIndex`);
  const positiveTabs = source.match(/tabIndex\s*=\s*(?:\{\s*[1-9]\d*\s*\}|["'][1-9]\d*["'])/g) || [];
  if (positiveTabs.length) failures.push(`${rel}: tabIndex positif interdit`);
  const tagsWithOutlineNone = source.match(/<[^>]+className\s*=\s*["'][^"']*outline-none[^"']*["'][^>]*>/gis) || [];
  for (const tag of tagsWithOutlineNone) if (!/focus-visible:/.test(tag)) failures.push(`${rel}: outline-none sans focus-visible équivalent`);
  if (/dangerouslySetInnerHTML/.test(source) && rel !== "components/seo/json-ld.tsx") failures.push(`${rel}: HTML direct interdit dans l'UI`);
}

for (const required of ["docs/quality/accessibility-ux.md", "scripts/mobile-first-check.mjs", "scripts/seo-check.mjs", "scripts/premium-icon-check.mjs"]) {
  if (!fs.existsSync(path.join(root, required))) failures.push(`${required} manquant`);
}
if (failures.length) {
  console.error("Accessibility & UX Gate — FAIL");
  for (const failure of [...new Set(failures)]) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`Accessibility & UX Gate — PASS (statique) — ${files.length} fichiers UI contrôlés. Contraste/clavier/reflow restent à vérifier au navigateur.`);

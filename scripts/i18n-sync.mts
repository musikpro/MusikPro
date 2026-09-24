#!/usr/bin/env -S npx tsx
/**
 * Scans the client-facing UI source for t("...") calls, finds French source strings that are
 * missing from lib/i18n/locales/{en,es,pt}.json, and fills them in via the connected AI
 * provider (same lib/ai pipeline already used for lyrics and admin text generation).
 *
 * Usage: npm run i18n:sync [-- --check]
 *   --check   exits with a non-zero status if any locale is missing keys, without calling the
 *             AI provider or writing files (useful in CI to catch un-synced translations). This
 *             mode is a pure local file scan and needs no environment variables at all.
 *
 * Actually translating (the default, non --check mode) needs the same environment as
 * `npm run db:migrate` (DATABASE_SERVICE_URL, and either a provider configured in
 * /admin/ai-providers or an ANTHROPIC_API_KEY/OPENAI_API_KEY fallback) — lib/i18n/ai-translate
 * is only imported lazily below, so --check never touches the database.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { TranslationLocale } from "../lib/i18n/ai-translate";

const ROOT = path.dirname(fileURLToPath(import.meta.url)) + "/..";
const SCAN_DIRS = ["app/dashboard", "components/banani", "components/mobile-bottom-nav.tsx"];
const LOCALES: TranslationLocale[] = ["en", "es", "pt"];
const BATCH_SIZE = 40;
const CHECK_ONLY = process.argv.includes("--check");

/**
 * Strings passed to t() indirectly (e.g. t(variable) where the literal lives in a data array
 * elsewhere, such as DesktopSidebar's nav items) aren't found by the T_CALL regex below, which
 * only matches literal t("...") call sites. List them here so they still get synced.
 */
const MANUAL_KEYS = ["Mes paroles"];

function walk(entry: string): string[] {
  const abs = path.join(ROOT, entry);
  const stat = statSync(abs);
  if (stat.isFile()) return [abs];
  const files: string[] = [];
  for (const name of readdirSync(abs)) {
    if (name === "node_modules" || name === ".next") continue;
    const child = path.join(entry, name);
    const childAbs = path.join(ROOT, child);
    if (statSync(childAbs).isDirectory()) files.push(...walk(child));
    else if (/\.tsx?$/.test(name)) files.push(childAbs);
  }
  return files;
}

/**
 * Matches t("...") and translateTemplate("...", ...) call sites, capturing the string literal's
 * content (translateTemplate's first argument is the key; its {param} placeholders are filled in
 * after translation, at render time, so the key itself is a plain literal like a t() call).
 */
const T_CALL = /\b(?:t|translateTemplate)\(\s*(["'`])((?:\\.|(?!\1)[^\\])*)\1/g;

function unescape(literal: string): string {
  return literal.replace(/\\(.)/g, "$1");
}

function collectKeys(files: string[]): Set<string> {
  const keys = new Set<string>();
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(T_CALL)) {
      const key = unescape(match[2]);
      if (key.includes("${"))
        console.warn(
          `  ! ${path.relative(ROOT, file)}: t(\`...\${...}\`) interpolates before translation, so this key can never match at runtime — use translateTemplate("...", { param }) instead. Key: ${key}`,
        );
      keys.add(key);
    }
  }
  return keys;
}

function loadDictionary(locale: TranslationLocale): Record<string, string> {
  const file = path.join(ROOT, "lib/i18n/locales", `${locale}.json`);
  return JSON.parse(readFileSync(file, "utf8"));
}

function writeDictionary(locale: TranslationLocale, dict: Record<string, string>) {
  const file = path.join(ROOT, "lib/i18n/locales", `${locale}.json`);
  const sorted = Object.fromEntries(Object.keys(dict).sort((a, b) => a.localeCompare(b, "fr")).map((k) => [k, dict[k]]));
  writeFileSync(file, JSON.stringify(sorted, null, 2) + "\n");
}

async function main() {
  const translateBatch = CHECK_ONLY ? null : (await import("../lib/i18n/ai-translate")).translateBatch;

  const files = SCAN_DIRS.flatMap(walk);
  const usedKeys = collectKeys(files);
  for (const key of MANUAL_KEYS) usedKeys.add(key);
  console.log(`Scanned ${files.length} files, found ${usedKeys.size} distinct t("...") strings (incl. ${MANUAL_KEYS.length} manual).`);

  let anyMissing = false;
  for (const locale of LOCALES) {
    const dict = loadDictionary(locale);
    const missing = [...usedKeys].filter((key) => !(key in dict));
    if (!missing.length) {
      console.log(`  ${locale}: up to date (${Object.keys(dict).length} keys).`);
      continue;
    }
    anyMissing = true;
    console.log(`  ${locale}: ${missing.length} missing key(s).`);
    if (CHECK_ONLY) {
      for (const key of missing.slice(0, 10)) console.log(`    - ${key}`);
      continue;
    }
    for (let i = 0; i < missing.length; i += BATCH_SIZE) {
      const batch = missing.slice(i, i + BATCH_SIZE);
      console.log(`    translating ${batch.length} string(s) (${i + batch.length}/${missing.length})...`);
      const translations = await translateBatch!(locale, batch);
      Object.assign(dict, translations);
      const stillMissing = batch.filter((key) => !(key in translations));
      if (stillMissing.length) console.warn(`    ! AI response omitted ${stillMissing.length} key(s), left untranslated (fallback to French).`);
    }
    writeDictionary(locale, dict);
    console.log(`  ${locale}: written, now ${Object.keys(dict).length} keys.`);
  }

  if (CHECK_ONLY && anyMissing) {
    console.error("\nSome locales are missing translations. Run `npm run i18n:sync` to fill them in.");
    process.exit(1);
  }
  console.log(anyMissing ? "\nDone." : "\nAll locales already up to date, nothing to do.");
}

main().catch((error) => {
  console.error("i18n:sync failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});

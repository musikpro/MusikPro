#!/usr/bin/env -S npx tsx
/**
 * Scans the client-facing UI source for t("...") calls and writes (or, with --check, verifies)
 * lib/i18n/manifest.json: the sorted list of the French keys found in the code. The manifest is
 * what the admin "Actualiser les traductions" button translates from.
 *
 * Usage: npm run i18n:manifest | npm run i18n:check | npm run i18n:sync
 *   --manifest-only  (i18n:manifest) only rewrites the manifest if stale. Pure local file scan:
 *                    no environment variable, no database, no AI, no JSON dictionary read.
 *   --check          (i18n:check) exits 1 ONLY if the manifest is stale. Texts missing from
 *                    lib/i18n/locales/{en,es,pt}.json are reported per locale but do not fail:
 *                    translations are filled from /admin/languages. Also needs no environment.
 *   (default)        (i18n:sync, optional locally) fills the missing keys in the JSON dictionaries
 *                    via the connected AI provider (same lib/ai pipeline as lyrics generation) and
 *                    writes the manifest. Needs the same environment as `npm run db:migrate`;
 *                    lib/i18n/ai-translate is only imported lazily, so the other modes never
 *                    touch the database.
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { TranslationLocale } from "../lib/i18n/ai-translate";

const ROOT = path.dirname(fileURLToPath(import.meta.url)) + "/..";
const SCAN_DIRS_WANTED = [
  "app/dashboard",
  "app/s",
  "app/page.tsx",
  "app/not-found.tsx",
  "app/loading.tsx",
  "components/banani",
  "components/mobile",
  "components/mobile-bottom-nav.tsx",
  "components/dashboard-nav.tsx",
  "components/checkout-button.tsx",
  "components/ui",
  "components/pwa",
];
const SCAN_DIRS = SCAN_DIRS_WANTED.filter((entry) => {
  const exists = existsSync(path.join(ROOT, entry));
  if (!exists) console.warn(`  ! scan path not found, skipped: ${entry}`);
  return exists;
});
const LOCALES: TranslationLocale[] = ["en", "es", "pt"];
const BATCH_SIZE = 40;
const CHECK_ONLY = process.argv.includes("--check");
const MANIFEST_ONLY = process.argv.includes("--manifest-only");

/**
 * Strings passed to t() indirectly (e.g. t(variable) where the literal lives in a data array
 * elsewhere, such as DesktopSidebar's nav items) aren't found by the T_CALL regex below, which
 * only matches literal t("...") call sites. List them here so they still get synced.
 */
const MANUAL_KEYS = [
  // DesktopSidebar / MobileMenuDrawer : libellés de menus passés à t(label) depuis un tableau.
  "Mes paroles",
  "Paiements",
  // StepAdditionalParams / FinalConfirmationScreen / DesktopWorkspace : t(voice.text), t(demo.choices.voice).
  "Femme",
  "Homme",
  "Duo",
  // StepAdditionalParams / FinalConfirmationScreen / DesktopWorkspace : t(lang.name) pour les langues par défaut
  // (lib/languages/catalog.ts, DEFAULT_LANGUAGES ; « Français » est déjà une clé littérale ailleurs).
  "Anglais",
  "Espagnol",
  "Portugais",
];

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
  const sorted = Object.fromEntries(
    Object.keys(dict)
      .sort((a, b) => a.localeCompare(b, "fr"))
      .map((k) => [k, dict[k]]),
  );
  writeFileSync(file, JSON.stringify(sorted, null, 2) + "\n");
}

const MANIFEST_FILE = path.join(ROOT, "lib/i18n/manifest.json");

function manifestSource(keys: Set<string>): string {
  return (
    JSON.stringify(
      [...keys].sort((a, b) => a.localeCompare(b, "fr")),
      null,
      2,
    ) + "\n"
  );
}

async function main() {
  const translateBatch = CHECK_ONLY || MANIFEST_ONLY ? null : (await import("../lib/i18n/ai-translate")).translateBatch;

  const files = SCAN_DIRS.flatMap(walk);
  const usedKeys = collectKeys(files);
  for (const key of MANUAL_KEYS) usedKeys.add(key);
  console.log(
    `Scanned ${files.length} files, found ${usedKeys.size} distinct t("...") strings (incl. ${MANUAL_KEYS.length} manual).`,
  );

  let anyMissing = false;
  let manifestWritten = false;
  let staleManifest = false;
  const expectedManifest = manifestSource(usedKeys);
  let manifestStale = false;
  try {
    manifestStale = readFileSync(MANIFEST_FILE, "utf8") !== expectedManifest;
  } catch {
    manifestStale = true;
  }
  if (manifestStale) {
    if (CHECK_ONLY) {
      staleManifest = true;
      console.error("  manifest: lib/i18n/manifest.json is out of date.");
    } else {
      writeFileSync(MANIFEST_FILE, expectedManifest);
      manifestWritten = true;
      console.log(`  manifest: written (${usedKeys.size} keys).`);
    }
  } else {
    console.log(`  manifest: up to date (${usedKeys.size} keys).`);
  }

  if (MANIFEST_ONLY) return;

  for (const locale of LOCALES) {
    const dict = loadDictionary(locale);
    const missing = [...usedKeys].filter((key) => !(key in dict));
    if (!missing.length) {
      console.log(`  ${locale}: up to date (${Object.keys(dict).length} keys).`);
      continue;
    }
    if (CHECK_ONLY) {
      console.log(
        `  ${locale}: ${missing.length} texte(s) sans traduction (à traduire depuis /admin/languages ou avec npm run i18n:sync).`,
      );
      for (const key of missing.slice(0, 10)) console.log(`    - ${key}`);
      continue;
    }
    anyMissing = true;
    console.log(`  ${locale}: ${missing.length} missing key(s).`);
    for (let i = 0; i < missing.length; i += BATCH_SIZE) {
      const batch = missing.slice(i, i + BATCH_SIZE);
      console.log(`    translating ${batch.length} string(s) (${i + batch.length}/${missing.length})...`);
      const translations = await translateBatch!(locale, batch);
      Object.assign(dict, translations);
      const stillMissing = batch.filter((key) => !(key in translations));
      if (stillMissing.length)
        console.warn(
          `    ! AI response omitted ${stillMissing.length} key(s), left untranslated (fallback to French).`,
        );
    }
    writeDictionary(locale, dict);
    console.log(`  ${locale}: written, now ${Object.keys(dict).length} keys.`);
  }

  if (CHECK_ONLY && staleManifest) {
    console.error("\nLe manifeste lib/i18n/manifest.json est périmé. Lancez `npm run i18n:manifest`.");
    process.exit(1);
  }
  console.log(
    anyMissing
      ? "\nDone."
      : manifestWritten
        ? "\nManifest rewritten; all locales already up to date."
        : "\nAll locales already up to date, nothing to do.",
  );
}

main().catch((error) => {
  console.error("i18n:sync failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});

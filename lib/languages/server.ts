import "server-only";

import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { languages } from "@/db/schema";
import { DEFAULT_LANGUAGES, type LanguageCatalog, type LanguageOption } from "./catalog";

function toOption(row: typeof languages.$inferSelect): LanguageOption {
  return { id: row.id, code: row.code, name: row.name, nativeName: row.nativeName, flag: row.flag };
}

export async function getActiveLanguageCatalog(options: { demo?: boolean } = {}): Promise<LanguageCatalog> {
  try {
    const [interfaceRows, lyricsRows] = await Promise.all([
      db
        .select()
        .from(languages)
        .where(eq(languages.interfaceEnabled, true))
        .orderBy(asc(languages.interfaceOrder), asc(languages.name)),
      db
        .select()
        .from(languages)
        .where(eq(languages.lyricsEnabled, true))
        .orderBy(asc(languages.lyricsOrder), asc(languages.name)),
    ]);
    return { interfaceLanguages: interfaceRows.map(toOption), lyricsLanguages: lyricsRows.map(toOption) };
  } catch (error) {
    if (!options.demo) throw error;
    const fallback = DEFAULT_LANGUAGES.map(
      ({ interfaceEnabled: _interfaceEnabled, lyricsEnabled: _lyricsEnabled, ...language }) => language,
    );
    return { interfaceLanguages: fallback, lyricsLanguages: fallback };
  }
}

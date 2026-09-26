import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { phonePrefixes } from "@/db/schema";
import { DEFAULT_PHONE_PREFIXES, type PhonePrefixOption } from "./catalog";

export async function getActivePhonePrefixes(options: { demo?: boolean } = {}): Promise<PhonePrefixOption[]> {
  try {
    const rows = await db
      .select()
      .from(phonePrefixes)
      .where(and(eq(phonePrefixes.active, true)))
      .orderBy(asc(phonePrefixes.sortOrder), asc(phonePrefixes.countryName));
    if (rows.length || !options.demo) {
      return rows.map((row) => ({
        id: row.id,
        countryCode: row.countryCode,
        countryName: row.countryName,
        flag: row.flag,
        dialCode: row.dialCode,
        digits: row.digits,
        placeholder: row.placeholder,
        translations: row.translations as PhonePrefixOption["translations"],
      }));
    }
  } catch (error) {
    if (!options.demo) throw error;
  }
  return DEFAULT_PHONE_PREFIXES;
}

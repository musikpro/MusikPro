import "server-only";

import { asc } from "drizzle-orm";
import { db } from "@/db";
import { currencies } from "@/db/schema";
import { DEFAULT_CURRENCIES, type CreditCurrency } from "./currency";

/** Every currency (visible or hidden) — used by the admin and to validate country associations. */
export async function getCurrencyCatalog(): Promise<CreditCurrency[]> {
  try {
    const rows = await db.select().from(currencies).orderBy(asc(currencies.sortOrder), asc(currencies.code));
    if (rows.length) return rows;
  } catch {
    // Migration not applied yet: the built-in list keeps the app working.
  }
  return DEFAULT_CURRENCIES;
}

/** Currencies the owner lets clients pick from (XOF is always among them). */
export async function getEnabledCurrencies(): Promise<CreditCurrency[]> {
  const catalog = await getCurrencyCatalog();
  const enabled = catalog.filter((item) => item.enabled);
  return enabled.length ? enabled : DEFAULT_CURRENCIES.filter((item) => item.code === "XOF");
}

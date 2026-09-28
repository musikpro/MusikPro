"use server";

import { cookies } from "next/headers";
import { getActiveLanguageCatalog } from "./server";
import { LANDING_LANGUAGE_COOKIE } from "./landing-language-cookie";

// Lets a visitor on the public landing page switch the interface language for real (server-
// rendered), reusing the same DB-backed active language catalog as the rest of the SaaS
// (lib/languages/server.ts) instead of a second, hardcoded list. Called directly from a client
// transition (see LandingLanguageSwitcher) rather than through a <form action> + redirect(): a
// full navigation reloads every asset and re-runs the whole page waterfall, which visibly lags —
// the caller instead does a plain router.refresh() after this resolves, which only re-renders
// the server components in place.
export async function setLandingLanguage(code: string): Promise<void> {
  const catalog = await getActiveLanguageCatalog();
  const isActive = catalog.interfaceLanguages.some((language) => language.code === code);
  if (!isActive) return;

  const cookieStore = await cookies();
  cookieStore.set(LANDING_LANGUAGE_COOKIE, code, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}

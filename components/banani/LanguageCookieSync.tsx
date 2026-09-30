"use client";

import { useEffect } from "react";
import { persistLanguageCookie } from "@/lib/languages/preference-client";

/** Mémorise la langue de l'URL (`/en`…) dans le cookie commun landing + tableau de bord. */
export default function LanguageCookieSync({ code }: { code: string }) {
  useEffect(() => {
    persistLanguageCookie(code);
  }, [code]);
  return null;
}

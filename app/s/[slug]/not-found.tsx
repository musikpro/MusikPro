import { headers } from "next/headers";
import { resolveLocaleFromAcceptLanguage } from "@/lib/i18n/request-locale";
import { translateForLocale } from "@/lib/i18n/translate";

export default async function PublicSongNotFound() {
  const locale = resolveLocaleFromAcceptLanguage((await headers()).get("accept-language"));
  const t = (text: string) => translateForLocale(text, locale);

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-10 text-center font-body">
      <h1 className="font-headings font-bold text-xl text-foreground mb-2">{t("Chanson indisponible")}</h1>
      <p className="text-sm text-muted-foreground mb-6">
        {t("Ce lien n'existe plus ou n'est plus accessible publiquement.")}
      </p>
      <a href="/" className="font-semibold text-foreground underline">
        {t("Découvrir MusikPro")}
      </a>
    </main>
  );
}

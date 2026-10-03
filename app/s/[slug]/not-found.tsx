import { primeOverlay } from "@/lib/i18n/overlay-server";
import Link from "next/link";
import { resolvePageLocale } from "@/lib/i18n/page-locale-server";
import { translateForLocale } from "@/lib/i18n/translate";

export default async function PublicSongNotFound() {
  const locale = await resolvePageLocale();
  await primeOverlay(locale);
  const t = (text: string) => translateForLocale(text, locale);

  return (
    <main className="public-song-page">
      <div className="psp-backdrop-fallback" />
      <div className="psp-scrim" />
      <div className="psp-card">
        <h1 className="psp-notfound-title">{t("Chanson indisponible")}</h1>
        <p className="psp-notfound-text">{t("Ce lien n'existe plus ou n'est plus accessible publiquement.")}</p>
        <Link href="/" className="psp-badge">
          {t("Découvrir MusikPro")}
        </Link>
      </div>
    </main>
  );
}

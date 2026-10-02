import { headers } from "next/headers";
import { primeOverlay } from "@/lib/i18n/overlay-server";
import { resolveLocaleFromAcceptLanguage } from "@/lib/i18n/request-locale";
import { translateForLocale } from "@/lib/i18n/translate";
import { Skeleton, SkeletonCards } from "@/components/ui/skeleton";

export default async function RootLoading() {
  const locale = resolveLocaleFromAcceptLanguage((await headers()).get("accept-language"));
  await primeOverlay(locale);
  const t = (text: string) => translateForLocale(text, locale);
  return (
    <main className="shell skeleton-page" aria-busy="true" aria-label={t("Chargement")}>
      <Skeleton className="skeleton-page-title" />
      <Skeleton style={{ width: "min(38rem, 92vw)", height: "1rem", marginBottom: ".75rem" }} />
      <Skeleton style={{ width: "min(30rem, 78vw)", height: "1rem", marginBottom: "2rem" }} />
      <SkeletonCards count={3} />
      <span className="sr-only">{t("Chargement…")}</span>
    </main>
  );
}

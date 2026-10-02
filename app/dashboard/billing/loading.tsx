import { headers } from "next/headers";
import { primeOverlay } from "@/lib/i18n/overlay-server";
import { resolveLocaleFromAcceptLanguage } from "@/lib/i18n/request-locale";
import { translateForLocale } from "@/lib/i18n/translate";
import { Skeleton, SkeletonCards, SkeletonTable } from "@/components/ui/skeleton";
export default async function Loading() {
  const locale = resolveLocaleFromAcceptLanguage((await headers()).get("accept-language"));
  await primeOverlay(locale);
  const t = (text: string) => translateForLocale(text, locale);
  return (
    <main className="shell skeleton-page" aria-busy="true" aria-label={t("Chargement de la facturation")}>
      <Skeleton className="skeleton-page-title" />
      <SkeletonCards count={3} />
      <Skeleton className="skeleton-section-title" />
      <SkeletonTable columns={4} rows={6} />
      <span className="sr-only">{t("Chargement…")}</span>
    </main>
  );
}

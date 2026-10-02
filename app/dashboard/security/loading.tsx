import { primeOverlay } from "@/lib/i18n/overlay-server";
import { resolveDashboardLocale } from "@/lib/i18n/dashboard-locale";
import { translateForLocale } from "@/lib/i18n/translate";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
export default async function Loading() {
  const locale = await resolveDashboardLocale();
  await primeOverlay(locale);
  const t = (text: string) => translateForLocale(text, locale);
  return (
    <main className="shell skeleton-page" aria-busy="true" aria-label={t("Chargement de la sécurité")}>
      <Skeleton className="skeleton-page-title" />
      <div className="card skeleton-card">
        <Skeleton className="skeleton-heading" />
        <SkeletonText lines={4} />
        <Skeleton className="skeleton-button" />
      </div>
      <span className="sr-only">{t("Chargement…")}</span>
    </main>
  );
}

import { Skeleton } from "@/components/ui/skeleton";
import { primeOverlay } from "@/lib/i18n/overlay-server";
import { resolvePageLocale } from "@/lib/i18n/page-locale-server";
import { translateForLocale } from "@/lib/i18n/translate";

export default async function Loading() {
  const locale = await resolvePageLocale();
  await primeOverlay(locale);
  const t = (text: string) => translateForLocale(text, locale);
  return (
    <main className="auth-page" aria-busy="true" aria-label={t("Ouverture de votre espace")}>
      <section className="auth-panel">
        <div className="auth-stage">
          <Skeleton width="4rem" height="4rem" style={{ marginInline: "auto" }} />
          <Skeleton width="70%" height="2rem" style={{ marginInline: "auto" }} />
          <Skeleton width="88%" height="1rem" style={{ marginInline: "auto" }} />
        </div>
        <span className="sr-only">{t("Ouverture de votre tableau de bord…")}</span>
      </section>
    </main>
  );
}

import type { Metadata } from "next";
import { privatePageMetadata } from "@/lib/seo/metadata";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { NativeBottomNav } from "@/components/mobile/native-bottom-nav";
import { isDemoRequest, requireUser } from "@/lib/auth/session";
import { hasAppRole } from "@/lib/auth/permissions";
import { DemoProvider } from "@/components/banani/DemoProvider";
import { eq } from "drizzle-orm";
import { db, userQuery } from "@/db";
import { credits } from "@/db/schema";
import { getActiveCreditPlans } from "@/lib/credit-plans/server";
import { getEnabledCurrencies } from "@/lib/credit-plans/currencies-server";
import { getActiveOccasions } from "@/lib/occasions/server";
import { getActiveMusicStyles } from "@/lib/music-styles/server";
import { getActiveRecipientRelations } from "@/lib/recipient-relations/server";
import { listDiscoverSongs } from "@/lib/discover/server";
import { getActiveLanguageCatalog } from "@/lib/languages/server";
import { getActivePhonePrefixes } from "@/lib/phone-prefixes/server";
import { detectCurrency } from "@/lib/languages/detection";
import {
  readLanguagePreference,
  readRequestLocale,
  readRequestPath,
  resolveInterfaceLanguage,
  resolveUrlLanguage,
} from "@/lib/languages/preference";
import { withLocalePrefix } from "@/lib/languages/locale-path";
import { isPaymentBypassEnabled } from "@/lib/settings/payment-bypass";
import { getMusicfulGenerationScreenSettings, getMusicfulVersionsPerGeneration } from "@/lib/ai/musicful";
import { getStoreLinks } from "@/lib/settings/store-links";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "./banani.css";

export const metadata: Metadata = privatePageMetadata;

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Authoritative server-side guard for every current and future /dashboard page.
  const session = await requireUser();
  const demo = await isDemoRequest();
  const requestHeaders = await headers();
  const preferredLanguageCode = await readLanguagePreference();
  // Reserved for SaaS owner accounts only — a paying customer never sees it, bypass flag or not.
  const isOwnerAccount = hasAppRole((session.user as { role?: string }).role, "admin");
  const languageCatalogPromise = getActiveLanguageCatalog({ demo });
  const urlLocaleCode = await readRequestLocale();
  if (!urlLocaleCode) {
    // Un-prefixed dashboard URL (old bookmark, redirect after login…): send the user to the same
    // page under their language's prefix — saved choice, else geo-IP, else default.
    const catalog = await languageCatalogPromise;
    const language = await resolveInterfaceLanguage(requestHeaders, catalog.interfaceLanguages, preferredLanguageCode);
    redirect(withLocalePrefix(await readRequestPath(), language?.code ?? "fr"));
  }
  // Independent lookups run concurrently (they used to be awaited one after the other on every
  // dashboard navigation). The interface language waits only for the catalog it depends on.
  const [
    creditPlans,
    occasionOptions,
    musicStyleOptions,
    recipientRelationOptions,
    discoverSongs,
    languageCatalog,
    detectedInterfaceLanguage,
    phonePrefixOptions,
    detectedCurrency,
    currencyOptions,
    paymentBypassEnabled,
    versionsPerGeneration,
    generationScreen,
    storeLinks,
    balance,
  ] = await Promise.all([
    getActiveCreditPlans({ demo }),
    getActiveOccasions({ demo }),
    getActiveMusicStyles({ demo }),
    getActiveRecipientRelations({ demo }),
    // Real accounts only: the demo library is the static showcase data of DemoProvider.
    demo ? Promise.resolve([]) : listDiscoverSongs(session.user.id),
    languageCatalogPromise,
    languageCatalogPromise.then((catalog) => resolveUrlLanguage(urlLocaleCode, catalog.interfaceLanguages) ?? null),
    getActivePhonePrefixes({ demo }),
    detectCurrency(requestHeaders),
    getEnabledCurrencies(),
    !demo && isOwnerAccount ? isPaymentBypassEnabled() : Promise.resolve(false),
    getMusicfulVersionsPerGeneration(),
    getMusicfulGenerationScreenSettings(),
    getStoreLinks(),
    demo
      ? Promise.resolve(0)
      : userQuery(
          session.user.id,
          db.select({ balance: credits.balance }).from(credits).where(eq(credits.userId, session.user.id)).limit(1),
        ).then((rows) => Number(rows[0]?.balance ?? 0)),
  ]);
  // The language comes from the URL prefix; one that is not an active catalog language is a 404.
  if (!detectedInterfaceLanguage) notFound();
  return (
    <DemoProvider
      mode={demo ? "demo" : "real"}
      initialBalance={balance}
      paymentBypassEnabled={paymentBypassEnabled}
      versionsPerGeneration={versionsPerGeneration}
      generationRedirectDelaySeconds={generationScreen.redirectDelaySeconds}
      generationPollIntervalMs={generationScreen.pollingIntervalMs}
      storeLinks={storeLinks}
      initialCreditPlans={creditPlans}
      initialOccasions={occasionOptions}
      initialMusicStyles={musicStyleOptions}
      initialRecipientRelations={recipientRelationOptions}
      initialDiscoverSongs={discoverSongs}
      initialInterfaceLanguages={languageCatalog.interfaceLanguages}
      initialLyricsLanguages={languageCatalog.lyricsLanguages}
      initialDetectedInterfaceLanguage={detectedInterfaceLanguage}
      initialPhonePrefixes={phonePrefixOptions}
      initialDetectedCurrency={detectedCurrency}
      initialCurrencies={currencyOptions}
      persistenceId={demo ? "demo" : session.user.id}
      initialProfile={{
        name: session.user.name,
        email: session.user.email,
        location: demo ? "Visite guidée MusikPro" : "Compte MusikPro",
      }}
    >
      {children}
      <MobileBottomNav />
      <NativeBottomNav />
    </DemoProvider>
  );
}

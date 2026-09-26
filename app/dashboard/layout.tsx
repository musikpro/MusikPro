import type { Metadata } from "next";
import { privatePageMetadata } from "@/lib/seo/metadata";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { isDemoRequest, requireUser } from "@/lib/auth/session";
import { hasAppRole } from "@/lib/auth/permissions";
import { DemoProvider } from "@/components/banani/DemoProvider";
import { eq } from "drizzle-orm";
import { db, userQuery } from "@/db";
import { credits } from "@/db/schema";
import { getActiveCreditPlans } from "@/lib/credit-plans/server";
import { getActiveOccasions } from "@/lib/occasions/server";
import { getActiveMusicStyles } from "@/lib/music-styles/server";
import { getActiveRecipientRelations } from "@/lib/recipient-relations/server";
import { getPublishedLibraryCollections } from "@/lib/library-collections/server";
import { getActiveLanguageCatalog } from "@/lib/languages/server";
import { getActivePhonePrefixes } from "@/lib/phone-prefixes/server";
import { detectInterfaceLanguage } from "@/lib/languages/detection";
import { isPaymentBypassEnabled } from "@/lib/settings/payment-bypass";
import { getMusicfulVersionsPerGeneration } from "@/lib/ai/musicful";
import { headers } from "next/headers";
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
  const creditPlans = await getActiveCreditPlans({ demo });
  const occasionOptions = await getActiveOccasions({ demo });
  const musicStyleOptions = await getActiveMusicStyles({ demo });
  const recipientRelationOptions = await getActiveRecipientRelations({ demo });
  const libraryCollectionOptions = await getPublishedLibraryCollections();
  const languageCatalog = await getActiveLanguageCatalog({ demo });
  const phonePrefixOptions = await getActivePhonePrefixes({ demo });
  const detectedInterfaceLanguage = await detectInterfaceLanguage(await headers(), languageCatalog.interfaceLanguages);
  // Reserved for SaaS owner accounts only — a paying customer never sees it, bypass flag or not.
  const isOwnerAccount = hasAppRole((session.user as { role?: string }).role, "admin");
  const paymentBypassEnabled = !demo && isOwnerAccount ? await isPaymentBypassEnabled() : false;
  const versionsPerGeneration = await getMusicfulVersionsPerGeneration();
  const balance = demo
    ? 0
    : Number(
        (
          await userQuery(
            session.user.id,
            db.select({ balance: credits.balance }).from(credits).where(eq(credits.userId, session.user.id)).limit(1),
          )
        )[0]?.balance ?? 0,
      );
  return (
    <DemoProvider
      mode={demo ? "demo" : "real"}
      initialBalance={balance}
      paymentBypassEnabled={paymentBypassEnabled}
      versionsPerGeneration={versionsPerGeneration}
      initialCreditPlans={creditPlans}
      initialOccasions={occasionOptions}
      initialMusicStyles={musicStyleOptions}
      initialRecipientRelations={recipientRelationOptions}
      initialLibraryCollections={libraryCollectionOptions}
      initialInterfaceLanguages={languageCatalog.interfaceLanguages}
      initialLyricsLanguages={languageCatalog.lyricsLanguages}
      initialDetectedInterfaceLanguage={detectedInterfaceLanguage}
      initialPhonePrefixes={phonePrefixOptions}
      persistenceId={demo ? "demo" : session.user.id}
      initialProfile={{
        name: session.user.name,
        email: session.user.email,
        location: demo ? "Visite guidée MusikPro" : "Compte MusikPro",
      }}
    >
      {children}
      <MobileBottomNav />
    </DemoProvider>
  );
}

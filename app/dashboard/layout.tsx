import type { Metadata } from "next";
import { privatePageMetadata } from "@/lib/seo/metadata";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { isDemoRequest, requireUser } from "@/lib/auth/session";
import { DemoProvider } from "@/components/banani/DemoProvider";
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
  return (
    <DemoProvider
      mode={demo ? "demo" : "real"}
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

import type { Metadata } from "next";
import { getPrivatePageMetadata } from "@/lib/seo/metadata";
import { primeOverlay } from "@/lib/i18n/overlay-server";
import { resolvePageLocale } from "@/lib/i18n/page-locale-server";

// privatePageMetadata (noindex) : version traduite par getPrivatePageMetadata.
export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolvePageLocale();
  await primeOverlay(locale);
  return getPrivatePageMetadata(locale);
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}

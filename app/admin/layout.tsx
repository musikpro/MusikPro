import type { Metadata } from "next";
import { privatePageMetadata } from "@/lib/seo/metadata";
import { requireAdmin } from "@/lib/auth/session";
import AdminShell from "@/components/admin/AdminShell";
import AdminToastProvider from "@/components/admin/AdminToastProvider";
import { isPaymentBypassEnabled } from "@/lib/settings/payment-bypass";
import "./admin.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = privatePageMetadata;

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  const paymentBypassEnabled = await isPaymentBypassEnabled();
  return (
    <AdminToastProvider>
      <AdminShell
        user={{ name: session.user.name, email: session.user.email }}
        paymentBypassEnabled={paymentBypassEnabled}
      >
        {children}
      </AdminShell>
    </AdminToastProvider>
  );
}

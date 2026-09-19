import type { Metadata } from "next";
import { privatePageMetadata } from "@/lib/seo/metadata";
import { requireAdmin } from "@/lib/auth/session";
import AdminShell from "@/components/admin/AdminShell";
import "./admin.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = privatePageMetadata;

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  return <AdminShell user={{ name: session.user.name, email: session.user.email }}>{children}</AdminShell>;
}

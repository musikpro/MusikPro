import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import AdminCouponForm from "@/components/admin/AdminCouponForm";
import { AdminBackLink, AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { getServiceDb } from "@/db";
import { coupons } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { updateCoupon } from "../actions";

export default async function AdminEditCouponPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const [coupon] = await getServiceDb().select().from(coupons).where(eq(coupons.id, id)).limit(1);
  if (!coupon) notFound();
  return (
    <AdminPage>
      <AdminBackLink href="/admin/coupons" />
      <AdminPageHeader
        eyebrow="Codes promo"
        title={`Modifier ${coupon.code}`}
        description="Les changements s’appliquent immédiatement au parcours de paiement."
      />
      <AdminCouponForm
        action={updateCoupon}
        values={{ ...coupon, expiresAt: coupon.expiresAt?.toISOString() ?? null }}
      />
    </AdminPage>
  );
}

import AdminCouponForm from "@/components/admin/AdminCouponForm";
import { AdminBackLink, AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { requireAdmin } from "@/lib/auth/session";
import { createCoupon } from "../actions";

export default async function AdminNewCouponPage() {
  await requireAdmin();
  return (
    <AdminPage>
      <AdminBackLink href="/admin/coupons" />
      <AdminPageHeader
        eyebrow="Codes promo"
        title="Nouveau code"
        description="Crée un code de réduction que tes clients pourront appliquer avant de payer."
      />
      <AdminCouponForm action={createCoupon} />
    </AdminPage>
  );
}

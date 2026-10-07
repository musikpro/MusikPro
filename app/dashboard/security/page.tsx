import { requireUser } from "@/lib/auth/session";
import Preview from "@/components/banani/Preview";
import SecurityAccountScreen from "@/components/banani/SecurityAccountScreen";
import { eq } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { twoFactor } from "@/db/schema";
import { isOwnerAccount, ownerTwoFactorEnabled } from "@/lib/auth/owner-two-factor";

/** Une application d'authentification est-elle enregistrée et vérifiée pour ce compte ? */
async function hasVerifiedTotp(userId: string) {
  try {
    const [row] = await getServiceDb()
      .select({ id: twoFactor.id, verified: twoFactor.verified })
      .from(twoFactor)
      .where(eq(twoFactor.userId, userId))
      .limit(1);
    return Boolean(row && row.verified !== false);
  } catch {
    return false;
  }
}
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const s = await requireUser();
  const q = await searchParams;
  const enabled = Boolean((s.user as { twoFactorEnabled?: boolean }).twoFactorEnabled);
  const twoFactorAvailable = ownerTwoFactorEnabled();
  const isOwner = await isOwnerAccount(s.user.role as string | undefined);
  const totpConfigured = isOwner && twoFactorAvailable ? await hasVerifiedTotp(s.user.id) : false;
  return (
    <Preview>
      <div className="banani-screen">
        <SecurityAccountScreen
          emailVerified={Boolean(s.user.emailVerified)}
          twoFactorEnabled={enabled}
          totpConfigured={totpConfigured}
          twoFactorAvailable={twoFactorAvailable}
          required={twoFactorAvailable && Boolean(q.required) && isOwner}
          isOwner={isOwner}
        />
      </div>
    </Preview>
  );
}

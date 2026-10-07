import { requireUser } from "@/lib/auth/session";
import Preview from "@/components/banani/Preview";
import SecurityAccountScreen from "@/components/banani/SecurityAccountScreen";
import { isOwnerAccount, ownerTwoFactorEnabled } from "@/lib/auth/owner-two-factor";
import { hasVerifiedTotp } from "@/lib/auth/totp-status";

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

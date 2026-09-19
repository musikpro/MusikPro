import { requireUser } from "@/lib/auth/session";
import Preview from "@/components/banani/Preview";
import SecurityAccountScreen from "@/components/banani/SecurityAccountScreen";
import { hasAppRole } from "@/lib/auth/permissions";
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const s = await requireUser();
  const q = await searchParams;
  const enabled = Boolean((s.user as { twoFactorEnabled?: boolean }).twoFactorEnabled);
  return (
    <Preview>
      <div className="banani-screen">
        <SecurityAccountScreen
          emailVerified={Boolean(s.user.emailVerified)}
          twoFactorEnabled={enabled}
          required={Boolean(q.required) && hasAppRole(s.user.role as string | undefined, "admin")}
          isOwner={hasAppRole(s.user.role as string | undefined, "admin")}
        />
      </div>
    </Preview>
  );
}

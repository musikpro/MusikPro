import Screen from "@/components/banani/SongCreationStep1Mobile";
import Preview from "@/components/banani/Preview";
import { isDemoRequest, requireUser } from "@/lib/auth/session";
import { FUNNEL_EVENT, writeFunnelEvent } from "@/lib/analytics/funnel";

export default async function Page() {
  const demo = await isDemoRequest();
  if (!demo) {
    const session = await requireUser();
    await writeFunnelEvent({ event: FUNNEL_EVENT.CREATION_STARTED, userId: session.user.id });
  }
  return (
    <Preview>
      <div className="banani-screen ">
        <Screen />
      </div>
    </Preview>
  );
}

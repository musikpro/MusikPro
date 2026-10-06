import { cookies } from "next/headers";
import { RESUME_SKIP_COOKIE } from "@/lib/creation-draft/resume-skip";
import Screen from "@/components/banani/SongCreationStep1Mobile";
import Preview from "@/components/banani/Preview";
import ResumeOrRestartCreation, { type ResumableCreationDraft } from "@/components/banani/ResumeOrRestartCreation";
import { isDemoRequest, requireUser } from "@/lib/auth/session";
import { getCreationDraft } from "@/lib/creation-draft/server";
import { FUNNEL_EVENT, writeFunnelEvent } from "@/lib/analytics/funnel";

export default async function Page() {
  const demo = await isDemoRequest();
  let draft: ResumableCreationDraft | null = null;
  if (!demo) {
    const session = await requireUser();
    await writeFunnelEvent({ event: FUNNEL_EVENT.CREATION_STARTED, userId: session.user.id });
    // Parcours déjà commencé sans chanson générée : proposer de le reprendre plutôt que de repartir de zéro.
    // Sauf si l'utilisateur vient de quitter volontairement le parcours (Retour / Tableau de bord) : voir resume-skip.ts.
    const skipResume = (await cookies()).get(RESUME_SKIP_COOKIE)?.value === "1";
    const saved = skipResume ? null : await getCreationDraft(session.user.id);
    if (saved) draft = { step: saved.step, data: saved.data, updatedAt: saved.updatedAt.toISOString() };
  }
  return (
    <Preview>
      <div className="banani-screen ">{draft ? <ResumeOrRestartCreation draft={draft} /> : <Screen />}</div>
    </Preview>
  );
}

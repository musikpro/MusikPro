import AfterPaymentLyrics from "@/components/banani/AfterPaymentLyrics";
import Preview from "@/components/banani/Preview";
import { isDemoRequest, requireUser } from "@/lib/auth/session";
import { getCreationDraft } from "@/lib/creation-draft/server";
import type { CreationDraftData } from "@/lib/validation/creation-draft";

// Retour du paiement des crédits : le brouillon du compte est relu côté serveur (la page vient d'être rechargée).
export default async function Page() {
  let draft: CreationDraftData | null = null;
  if (!(await isDemoRequest())) {
    const session = await requireUser();
    draft = (await getCreationDraft(session.user.id))?.data ?? null;
  }
  return (
    <Preview>
      <div className="banani-screen ">
        <AfterPaymentLyrics draft={draft} />
      </div>
    </Preview>
  );
}

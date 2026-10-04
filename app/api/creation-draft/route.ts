import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteCreationDraft, saveCreationDraft } from "@/lib/creation-draft/server";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { rejectCrossSiteMutation, rejectOversizedRequest, requireContentType } from "@/lib/security/request-guards";
import { creationDraftSaveSchema, isCreationDraftWorthKeeping } from "@/lib/validation/creation-draft";

export const runtime = "nodejs";

/** Renvoie l'identifiant de l'utilisateur connecté, ou la réponse d'erreur à retourner telle quelle. */
async function authorize(request: Request, scope: string, perMinute: number): Promise<string | Response> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  const limit = await rateLimit(`creation-draft:${scope}:${session.user.id}:${clientIp(request)}`, perMinute);
  if (limit.backend === "unavailable")
    return NextResponse.json({ error: "Le contrôle de débit est indisponible." }, { status: 503 });
  if (!limit.success)
    return NextResponse.json({ error: "Trop de requêtes. Réessaie dans un instant." }, { status: 429 });
  return session.user.id;
}

/** Enregistre le brouillon de création de l'utilisateur connecté (remplace le précédent, expire dans 30 jours). */
export async function PUT(request: Request) {
  const originFailure = rejectCrossSiteMutation(request);
  if (originFailure) return originFailure;
  const sizeFailure = rejectOversizedRequest(request, 96 * 1024);
  if (sizeFailure) return sizeFailure;
  const typeFailure = requireContentType(request, "application/json");
  if (typeFailure) return typeFailure;

  const userId = await authorize(request, "save", 60);
  if (typeof userId !== "string") return userId;

  const parsed = creationDraftSaveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Brouillon invalide." }, { status: 400 });
  if (!isCreationDraftWorthKeeping(parsed.data.data)) {
    return NextResponse.json({ error: "Choisis d’abord une occasion." }, { status: 422 });
  }

  try {
    await saveCreationDraft(userId, parsed.data);
  } catch {
    return NextResponse.json({ error: "Le brouillon n’a pas pu être enregistré." }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}

/** Supprime le brouillon de l'utilisateur connecté (« Recommencer de zéro »). Idempotent. */
export async function DELETE(request: Request) {
  const originFailure = rejectCrossSiteMutation(request);
  if (originFailure) return originFailure;

  const userId = await authorize(request, "delete", 30);
  if (typeof userId !== "string") return userId;

  await deleteCreationDraft(userId);
  return NextResponse.json({ ok: true });
}

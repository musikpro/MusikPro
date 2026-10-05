import { NextResponse } from "next/server";
import { ANSWER_ERROR_MESSAGES } from "@/lib/occasion-fields/answers";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, userQuery } from "@/db";
import { credits } from "@/db/schema";
import { getActiveAudioProvider } from "@/lib/ai/musicful";
import { getAudioProviderDefinition } from "@/lib/ai/audio-providers/catalog";
import { buildVocalHint, resolveStylePrompt } from "@/lib/ai/style-prompt";
import { submitSongGeneration } from "@/lib/ai/songs";
import { buildSongTitle } from "@/lib/ai/song-title";
import { songGenerateRequestSchema } from "@/lib/validation/ai";
import { recordSongGroupCharge } from "@/lib/credits/generation-refund";
import { deductCredits, refundCredits } from "@/lib/credits/service";
import { deleteCreationDraft } from "@/lib/creation-draft/server";
import { CREDITS_PER_GENERATION } from "@/lib/credit-plans/catalog";
import { hasAppRole } from "@/lib/auth/permissions";
import { isPaymentBypassEnabled } from "@/lib/settings/payment-bypass";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { rejectCrossSiteMutation, rejectOversizedRequest, requireContentType } from "@/lib/security/request-guards";
import { writeAuditLog } from "@/lib/security/audit";
import { OccasionDetailsError, resolveOccasionDetails } from "@/lib/occasion-fields/server";
import { createLogger } from "@/lib/observability/logger";
import { resolveAccentHint } from "@/lib/languages/accents-server";

export const runtime = "nodejs";
export const maxDuration = 60;
const logger = createLogger("songs-generate");

function mapVoiceToGender(voice: string): "male" | "female" | "" {
  const normalized = voice.trim().toLowerCase();
  if (normalized === "femme" || normalized === "female") return "female";
  if (normalized === "homme" || normalized === "male") return "male";
  return "";
}

export async function POST(request: Request) {
  const originFailure = rejectCrossSiteMutation(request);
  if (originFailure) return originFailure;
  const sizeFailure = rejectOversizedRequest(request, 48 * 1024);
  if (sizeFailure) return sizeFailure;
  const typeFailure = requireContentType(request, "application/json");
  if (typeFailure) return typeFailure;

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });

  const provider = await getActiveAudioProvider();
  if (!getAudioProviderDefinition(provider.providerId).implemented) {
    return NextResponse.json(
      { error: "Le fournisseur audio actif n’est pas encore intégré.", code: "AUDIO_PROVIDER_NOT_IMPLEMENTED" },
      { status: 503 },
    );
  }
  if (!provider.enabled || !provider.apiKey) {
    return NextResponse.json(
      { error: "La génération audio n’est pas encore configurée.", code: "MUSICFUL_NOT_CONFIGURED" },
      { status: 503 },
    );
  }
  if (!provider.allowLyricsToMusic) {
    return NextResponse.json(
      { error: "La génération de chansons est désactivée.", code: "MUSICFUL_CAPABILITY_DISABLED" },
      { status: 403 },
    );
  }

  const limit = await rateLimit(
    `songs:generate:${session.user.id}:${clientIp(request)}`,
    provider.maxGenerationsPerUserPerHour,
    3600,
  );
  if (limit.backend === "unavailable")
    return NextResponse.json({ error: "Le contrôle de débit est indisponible." }, { status: 503 });
  if (!limit.success)
    return NextResponse.json(
      { error: "Trop de générations. Réessaie plus tard.", code: "RATE_LIMITED" },
      { status: 429 },
    );

  const parsed = songGenerateRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Paramètres de génération invalides.", details: parsed.error.flatten() },
      { status: 400 },
    );
  const input = parsed.data;

  let occasionDetails: Awaited<ReturnType<typeof resolveOccasionDetails>>;
  try {
    occasionDetails = await resolveOccasionDetails(input.occasion, input.occasionDetails);
  } catch (error) {
    if (error instanceof OccasionDetailsError) {
      const first = Object.values(error.errors)[0];
      const cause = (first && ANSWER_ERROR_MESSAGES[first]) || "réponse invalide";
      return NextResponse.json(
        {
          error: `Certaines informations personnalisées sont invalides (${cause}). Vérifie l’étape « Personnalise ta chanson ».`,
          code: "OCCASION_DETAILS_INVALID",
          fields: error.errors,
        },
        { status: 422 },
      );
    }
    throw error;
  }

  const isOwner = hasAppRole((session.user as { role?: string }).role, "admin");
  const bypassActive = isOwner && (await isPaymentBypassEnabled());

  let newBalance: number;
  if (bypassActive) {
    const [row] = await userQuery(
      session.user.id,
      db.select({ balance: credits.balance }).from(credits).where(eq(credits.userId, session.user.id)).limit(1),
    );
    newBalance = Number(row?.balance ?? 0);
  } else {
    const deducted = await deductCredits(session.user.id, CREDITS_PER_GENERATION);
    if (deducted === null) {
      return NextResponse.json(
        {
          error: `Il faut ${CREDITS_PER_GENERATION} crédits pour lancer une génération musicale.`,
          code: "INSUFFICIENT_CREDITS",
        },
        { status: 402 },
      );
    }
    newBalance = deducted;
  }

  const title = buildSongTitle({
    recipientName: input.recipientName || occasionDetails.titleValue,
    occasion: input.occasion,
    genre: input.genre,
  });
  const style = await resolveStylePrompt(
    input.genre,
    input.mood,
    provider.strictStyleAdherence,
    input.occasion,
    buildVocalHint(input.language, input.voice, await resolveAccentHint(input.genre, input.language)),
  );
  const gender = mapVoiceToGender(input.voice) || provider.defaultGender || "";

  try {
    const { songGroupId, succeeded } = await submitSongGeneration(
      session.user.id,
      {
        title,
        occasion: input.occasion,
        style,
        lyrics: input.lyrics,
        occasionDetails: occasionDetails.answers.map(({ fieldId, label, value }) => ({ fieldId, label, value })),
        gender,
        instrumental: provider.defaultInstrumental ? 1 : 0,
      },
      provider.model,
      provider.versionsPerGeneration,
      provider.providerId,
    );
    if (succeeded === 0) {
      const refunded = bypassActive ? newBalance : await refundCredits(session.user.id, CREDITS_PER_GENERATION);
      return NextResponse.json(
        {
          error: "La génération n’a pas pu démarrer. Tes crédits ont été recrédités.",
          code: "MUSICFUL_SUBMIT_FAILED",
          newBalance: refunded ?? newBalance,
        },
        { status: 502 },
      );
    }
    // Génération réellement partie : on note le débit pour pouvoir rendre les crédits si elle échoue ensuite.
    if (!bypassActive) await recordSongGroupCharge(session.user.id, songGroupId, CREDITS_PER_GENERATION);
    await writeAuditLog({
      action: "musicful.generation.submitted",
      actorId: session.user.id,
      targetType: "song_group",
      targetId: songGroupId,
      metadata: { occasion: input.occasion, style, versionsSubmitted: succeeded },
    });
    // La chanson est lancée : le brouillon de création n'a plus lieu d'être (ne lève jamais).
    await deleteCreationDraft(session.user.id);
    return NextResponse.json({ songGroupId, newBalance });
  } catch (error) {
    const refunded = bypassActive ? newBalance : await refundCredits(session.user.id, CREDITS_PER_GENERATION);
    logger.error("Song generation submit failed", {
      userId: session.user.id,
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      {
        error: "La génération n’a pas pu démarrer. Tes crédits ont été recrédités.",
        code: "MUSICFUL_SUBMIT_FAILED",
        newBalance: refunded ?? newBalance,
      },
      { status: 502 },
    );
  }
}

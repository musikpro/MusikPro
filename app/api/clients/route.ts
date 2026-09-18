import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createClient, listClients } from "@/lib/clients/repository";
import { clientCreateSchema } from "@/lib/validation/clients";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { getSecurityLevel, securityPolicy } from "@/lib/security/config";
import { rejectCrossSiteMutation, rejectOversizedRequest, requireContentType } from "@/lib/security/request-guards";

export const runtime = "nodejs";

async function sessionUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user ?? null;
}

async function guardRate(request: Request, userId: string) {
  const level = getSecurityLevel();
  return rateLimit(`clients:${userId}:${clientIp(request)}`, securityPolicy[level].apiPerMinute);
}

export async function GET(request: Request) {
  const user = await sessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limit = await guardRate(request, user.id);
  if (limit.backend === "unavailable") return NextResponse.json({ error: "Security rate-limit backend unavailable" }, { status: 503 });
  if (!limit.success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  return NextResponse.json({ clients: await listClients(user.id) });
}

export async function POST(request: Request) {
  const originFailure = rejectCrossSiteMutation(request);
  if (originFailure) return originFailure;
  const sizeFailure = rejectOversizedRequest(request, 32 * 1024);
  if (sizeFailure) return sizeFailure;
  const typeFailure = requireContentType(request, "application/json");
  if (typeFailure) return typeFailure;

  const user = await sessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limit = await guardRate(request, user.id);
  if (limit.backend === "unavailable") return NextResponse.json({ error: "Security rate-limit backend unavailable" }, { status: 503 });
  if (!limit.success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const parsed = clientCreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid client", details: parsed.error.flatten() }, { status: 400 });
  const client = await createClient(user.id, parsed.data);
  return NextResponse.json({ client }, { status: 201 });
}

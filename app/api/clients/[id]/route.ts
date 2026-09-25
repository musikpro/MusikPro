import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteClient, getClient, updateClient } from "@/lib/clients/repository";
import { clientIdSchema, clientUpdateSchema } from "@/lib/validation/clients";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { getSecurityLevel, securityPolicy } from "@/lib/security/config";
import { rejectCrossSiteMutation, rejectOversizedRequest, requireContentType } from "@/lib/security/request-guards";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

async function sessionUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user ?? null;
}

async function requestContext(request: Request, ctx: Ctx) {
  const user = await sessionUser(request);
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  const parsedId = clientIdSchema.safeParse((await ctx.params).id);
  if (!parsedId.success) return { error: NextResponse.json({ error: "Invalid client id" }, { status: 400 }) } as const;
  const level = getSecurityLevel();
  const limit = await rateLimit(`clients:${user.id}:${clientIp(request)}`, securityPolicy[level].apiPerMinute);
  if (limit.backend === "unavailable")
    return { error: NextResponse.json({ error: "Security rate-limit backend unavailable" }, { status: 503 }) } as const;
  if (!limit.success) return { error: NextResponse.json({ error: "Too many requests" }, { status: 429 }) } as const;
  return { user, id: parsedId.data } as const;
}

export async function GET(request: Request, ctx: Ctx) {
  const checked = await requestContext(request, ctx);
  if ("error" in checked) return checked.error;
  const client = await getClient(checked.user.id, checked.id);
  return client ? NextResponse.json({ client }) : NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function PATCH(request: Request, ctx: Ctx) {
  const originFailure = rejectCrossSiteMutation(request);
  if (originFailure) return originFailure;
  const sizeFailure = rejectOversizedRequest(request, 32 * 1024);
  if (sizeFailure) return sizeFailure;
  const typeFailure = requireContentType(request, "application/json");
  if (typeFailure) return typeFailure;
  const checked = await requestContext(request, ctx);
  if ("error" in checked) return checked.error;
  const parsed = clientUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid client", details: parsed.error.flatten() }, { status: 400 });
  const client = await updateClient(checked.user.id, checked.id, parsed.data);
  return client ? NextResponse.json({ client }) : NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function DELETE(request: Request, ctx: Ctx) {
  const originFailure = rejectCrossSiteMutation(request);
  if (originFailure) return originFailure;
  const checked = await requestContext(request, ctx);
  if ("error" in checked) return checked.error;
  const deleted = await deleteClient(checked.user.id, checked.id);
  return deleted ? NextResponse.json({ deleted }) : NextResponse.json({ error: "Not found" }, { status: 404 });
}

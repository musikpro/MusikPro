import { headers } from "next/headers";
import { z } from "zod";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isCloudinaryConfigured, uploadImageToCloudinary } from "@/lib/storage/cloudinary";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { getSecurityLevel, securityPolicy } from "@/lib/security/config";
import { rejectCrossSiteMutation, rejectOversizedRequest, requireContentType } from "@/lib/security/request-guards";

export const runtime = "nodejs";

const uploadFormSchema = z.object({ file: z.instanceof(File) });

export async function POST(request: Request) {
  const originFailure = rejectCrossSiteMutation(request);
  if (originFailure) return originFailure;
  // 10 MiB image limit + bounded multipart overhead before parsing FormData.
  const sizeFailure = rejectOversizedRequest(request, 11 * 1024 * 1024);
  if (sizeFailure) return sizeFailure;
  const typeFailure = requireContentType(request, "multipart/form-data");
  if (typeFailure) return typeFailure;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = clientIp(request);
  const level = getSecurityLevel();
  const limit = await rateLimit(`upload:${session.user.id}:${ip}`, Math.max(5, Math.floor(securityPolicy[level].apiPerMinute / 2)));
  if (limit.backend === "unavailable") return NextResponse.json({ error: "Security rate-limit backend unavailable" }, { status: 503 });
  if (!limit.success) return NextResponse.json({ error: "Too many upload requests" }, { status: 429 });
  if (!isCloudinaryConfigured()) return NextResponse.json({ error: "Cloudinary is not enabled" }, { status: 503 });

  const form = await request.formData();
  const parsed = uploadFormSchema.safeParse({ file: form.get("file") });
  if (!parsed.success) return NextResponse.json({ error: "Image file is required", details: parsed.error.flatten() }, { status: 400 });
  const { file } = parsed.data;

  try {
    const uploaded = await uploadImageToCloudinary(file, { folder: `users/${session.user.id}` });
    return NextResponse.json(uploaded, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Image upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

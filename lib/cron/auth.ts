import { timingSafeEqual } from "node:crypto";

export function verifyCronRequest(request: Request) {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected) return process.env.NODE_ENV !== "production";

  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  const legacy = request.headers.get("x-cron-secret")?.trim();
  const received = bearer || legacy || "";
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

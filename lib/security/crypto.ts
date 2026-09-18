import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyHmacSha256(payload: string, signature: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature.replace(/^sha256=/, ""), "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

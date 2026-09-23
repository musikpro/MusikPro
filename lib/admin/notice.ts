import "server-only";
import { redirect } from "next/navigation";

export type AdminNoticeTone = "success" | "error" | "info";

const NOTICE_PARAM = "admin_notice";
const NOTICE_TONE_PARAM = "admin_notice_tone";

/** Appends the admin toast's message/tone to a path so AdminToastProvider can surface it after the redirect. */
export function withNotice(path: string, notice: { message: string; tone?: AdminNoticeTone }): string {
  const [base, existingQuery] = path.split("?");
  const params = new URLSearchParams(existingQuery);
  params.set(NOTICE_PARAM, notice.message);
  params.set(NOTICE_TONE_PARAM, notice.tone ?? "success");
  return `${base}?${params.toString()}`;
}

/** Same as Next.js `redirect()`, but confirms the outcome to the admin via a global toast on arrival. */
export function redirectWithNotice(path: string, notice: { message: string; tone?: AdminNoticeTone }): never {
  redirect(withNotice(path, notice));
}

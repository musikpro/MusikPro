export type AdminNoticeTone = "success" | "error";

/**
 * Encodes a toast message into a redirect target's query string — read once by
 * AdminToastQueryBridge (components/admin/AdminToastProvider.tsx) and then stripped from the
 * URL. Needed for Server Actions that `redirect()` on success, since a component that has
 * navigated away can no longer report its result through `useActionState`.
 */
export function withAdminNotice(path: string, message: string, tone: AdminNoticeTone = "success"): string {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}admin_notice=${encodeURIComponent(message)}&admin_notice_tone=${tone}`;
}

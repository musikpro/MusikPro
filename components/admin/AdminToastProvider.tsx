"use client";

import { createContext, Suspense, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import AdminToast from "./AdminToast";

export type AdminToastTone = "success" | "error" | "info";
export type AdminToastInput = { message: string; tone?: AdminToastTone; title?: string };

type ToastState = { id: number; message: string; tone: AdminToastTone; title?: string } | null;

const AdminToastContext = createContext<((input: AdminToastInput) => void) | null>(null);

/**
 * Single shared way to confirm a button action worked (or explain why it didn't) anywhere in
 * the owner dashboard — mounted once in app/admin/layout.tsx, so every admin page gets it for
 * free instead of each page wiring its own notice state.
 */
export function useAdminToast() {
  const showToast = useContext(AdminToastContext);
  if (!showToast) throw new Error("useAdminToast doit être utilisé à l’intérieur de AdminToastProvider.");
  return showToast;
}

const NOTICE_PARAM = "admin_notice";
const NOTICE_TONE_PARAM = "admin_notice_tone";
let nextToastId = 0;

/**
 * Lets a Server Action confirm success/failure after its own `redirect()` by encoding the
 * message in the destination URL (the same query-param-driven notice pattern already used by
 * the AI provider settings pages) — this component reads it once, shows the toast, then strips
 * the params from the URL so a refresh or back-navigation doesn't replay it.
 */
function AdminToastQueryBridge() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const showToast = useContext(AdminToastContext);
  const consumedRef = useRef<string | null>(null);

  useEffect(() => {
    const message = searchParams.get(NOTICE_PARAM);
    if (!message || !showToast) return;
    const key = searchParams.toString();
    if (consumedRef.current === key) return;
    consumedRef.current = key;
    const tone = (searchParams.get(NOTICE_TONE_PARAM) as AdminToastTone | null) ?? "success";
    showToast({ message, tone });

    const next = new URLSearchParams(searchParams.toString());
    next.delete(NOTICE_PARAM);
    next.delete(NOTICE_TONE_PARAM);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [searchParams, showToast, router, pathname]);

  return null;
}

export default function AdminToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState>(null);

  const showToast = useCallback((input: AdminToastInput) => {
    nextToastId += 1;
    setToast({ id: nextToastId, message: input.message, tone: input.tone ?? "success", title: input.title });
  }, []);

  return (
    <AdminToastContext.Provider value={showToast}>
      {children}
      <Suspense fallback={null}>
        <AdminToastQueryBridge />
      </Suspense>
      {toast ? <AdminToast key={toast.id} message={toast.message} tone={toast.tone} title={toast.title} /> : null}
    </AdminToastContext.Provider>
  );
}

"use client";

import { useEffect } from "react";
import { useAdminToast } from "./AdminToastProvider";

export type AdminActionState = { ok: boolean; message: string } | null;

/** Fires the global admin toast whenever a `useActionState` result changes — no navigation, no scroll, state stays put. */
export function useAdminActionToast(state: AdminActionState) {
  const showToast = useAdminToast();
  useEffect(() => {
    if (!state) return;
    showToast({ message: state.message, tone: state.ok ? "success" : "error" });
  }, [state, showToast]);
}

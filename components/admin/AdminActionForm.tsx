"use client";

import { useActionState, useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { useAdminActionToast, type AdminActionState } from "./useAdminActionToast";

/**
 * Drop-in replacement for `<form action={fn}>` that reports the result through the shared admin
 * toast instead of silently re-rendering (or crashing to app/admin/error.tsx on a thrown
 * validation error). `fn` must follow the `useActionState` shape — see actionErrorMessage in
 * lib/admin/action-state.ts for turning a caught error into its `message`.
 */
export default function AdminActionForm({
  action,
  id,
  className,
  style,
  onSuccess,
  children,
}: {
  action: (previous: AdminActionState, data: FormData) => Promise<AdminActionState>;
  id?: string;
  className?: string;
  style?: CSSProperties;
  /** Appelé après une action réussie (ex. recharger une liste paginée côté serveur). */
  onSuccess?: () => void;
  children: ReactNode;
}) {
  const [state, formAction] = useActionState<AdminActionState, FormData>(action, null);
  useAdminActionToast(state);
  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  });
  useEffect(() => {
    if (state?.ok) onSuccessRef.current?.();
  }, [state]);
  return (
    <form id={id} action={formAction} className={className} style={style}>
      {children}
    </form>
  );
}

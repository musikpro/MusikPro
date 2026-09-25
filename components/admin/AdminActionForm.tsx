"use client";

import { useActionState, type CSSProperties, type ReactNode } from "react";
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
  children,
}: {
  action: (previous: AdminActionState, data: FormData) => Promise<AdminActionState>;
  id?: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const [state, formAction] = useActionState<AdminActionState, FormData>(action, null);
  useAdminActionToast(state);
  return (
    <form id={id} action={formAction} className={className} style={style}>
      {children}
    </form>
  );
}

"use client";

import type { ReactNode } from "react";
import type { AdminButtonVariant } from "./AdminButton";

type AdminConfirmSubmitProps = {
  confirmMessage: string;
  variant?: AdminButtonVariant;
  className?: string;
  children: ReactNode;
};

const VARIANT_CLASS: Record<AdminButtonVariant, string> = {
  primary: "admin-btn-primary",
  secondary: "admin-btn-secondary",
  danger: "admin-btn-danger",
};

/** Submit button for a Server Action form that asks a native confirm() before letting the submit through — shares the same self-contained button classes as AdminButton. */
export default function AdminConfirmSubmit({ confirmMessage, variant = "secondary", className = "", children }: AdminConfirmSubmitProps) {
  return (
    <button
      type="submit"
      className={`admin-btn ${VARIANT_CLASS[variant]} ${className}`.trim()}
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) event.preventDefault();
      }}
    >
      {children}
    </button>
  );
}

"use client";

import type { ReactNode } from "react";

type AdminConfirmSubmitProps = {
  confirmMessage: string;
  className?: string;
  children: ReactNode;
};

/** Submit button for a Server Action form that asks a native confirm() before letting the submit through. */
export default function AdminConfirmSubmit({ confirmMessage, className, children }: AdminConfirmSubmitProps) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) event.preventDefault();
      }}
    >
      {children}
    </button>
  );
}

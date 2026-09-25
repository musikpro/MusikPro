"use client";

import { useState } from "react";
import Icon from "@/components/banani/Icon";

type AdminSecretFieldProps = {
  name: string;
  configured: boolean;
  placeholder: string;
  disabled?: boolean;
};

/** A secret already saved renders locked/greyed by default; "Modifier" unlocks it so a blank submit keeps the stored value instead of erasing it. */
export default function AdminSecretField({ name, configured, placeholder, disabled = false }: AdminSecretFieldProps) {
  const [locked, setLocked] = useState(configured);
  return (
    <div className="admin-secret-field">
      <input
        type="password"
        name={name}
        autoComplete="new-password"
        placeholder={placeholder}
        disabled={disabled || locked}
      />
      {configured ? (
        <button
          type="button"
          className="admin-secret-toggle"
          onClick={() => setLocked((value) => !value)}
          disabled={disabled}
        >
          <Icon i={locked ? "pencil" : "lock"} size={13} />
          {locked ? "Modifier" : "Verrouiller"}
        </button>
      ) : null}
    </div>
  );
}

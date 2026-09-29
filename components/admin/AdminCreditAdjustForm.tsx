"use client";

import { useId, useMemo, useRef, useState } from "react";
import AdminActionForm from "@/components/admin/AdminActionForm";
import Icon from "@/components/banani/Icon";
import type { AdminActionState } from "@/components/admin/useAdminActionToast";

export type CreditUserOption = { email: string; name: string | null; balance: number };

const MAX_SUGGESTIONS = 8;

/** Owner form to add credits to, or remove credits from, a customer balance (see adjustCredits). */
export default function AdminCreditAdjustForm({
  action,
  recentBuyers,
  users,
}: {
  action: (previous: AdminActionState, data: FormData) => Promise<AdminActionState>;
  recentBuyers: CreditUserOption[];
  users: CreditUserOption[];
}) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"add" | "remove">("add");
  const [email, setEmail] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const query = email.trim().toLowerCase();
  const suggestions = useMemo(() => {
    if (!query) return recentBuyers;
    return users
      .filter((option) => option.email.toLowerCase().includes(query) || option.name?.toLowerCase().includes(query))
      .slice(0, MAX_SUGGESTIONS);
  }, [query, recentBuyers, users]);
  const showMenu = open && suggestions.length > 0;
  const selected = users.find((option) => option.email.toLowerCase() === query);

  function choose(option: CreditUserOption) {
    setEmail(option.email);
    setOpen(false);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((index) => Math.min(index + 1, suggestions.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && showMenu) {
      event.preventDefault();
      const option = suggestions[active];
      if (option) choose(option);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <AdminActionForm className="admin-editor-grid" action={action}>
      <div className="admin-editor-field is-wide">
        <span id={`${listId}-mode`}>Opération</span>
        <div className="admin-segmented" role="radiogroup" aria-labelledby={`${listId}-mode`}>
          <label className={mode === "add" ? "is-active is-add" : undefined}>
            <input type="radio" name="mode" value="add" checked={mode === "add"} onChange={() => setMode("add")} />
            <Icon i="circle-plus" size={16} />
            Ajouter des crédits
          </label>
          <label className={mode === "remove" ? "is-active is-remove" : undefined}>
            <input
              type="radio"
              name="mode"
              value="remove"
              checked={mode === "remove"}
              onChange={() => setMode("remove")}
            />
            <Icon i="circle-minus" size={16} />
            Réduire des crédits
          </label>
        </div>
      </div>

      <div className="admin-editor-field admin-combobox">
        <label htmlFor={`${listId}-email`}>
          <span>E-mail utilisateur</span>
        </label>
        <input
          ref={inputRef}
          id={`${listId}-email`}
          type="email"
          name="email"
          required
          value={email}
          placeholder="utilisateur@exemple.com"
          autoComplete="off"
          role="combobox"
          aria-expanded={showMenu}
          aria-controls={`${listId}-list`}
          aria-autocomplete="list"
          onChange={(event) => {
            setEmail(event.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
        />
        {showMenu ? (
          <ul className="admin-combobox-menu" id={`${listId}-list`} role="listbox">
            {!query ? <li className="admin-combobox-heading">10 derniers acheteurs</li> : null}
            {suggestions.map((option, index) => (
              <li
                key={option.email}
                role="option"
                aria-selected={index === active}
                className={index === active ? "is-active" : undefined}
                // mousedown (not click) so the choice lands before the input's blur closes the menu
                onMouseDown={(event) => {
                  event.preventDefault();
                  choose(option);
                }}
                onMouseEnter={() => setActive(index)}
              >
                <span className="admin-combobox-avatar">{(option.name ?? option.email).slice(0, 1).toUpperCase()}</span>
                <span className="admin-combobox-identity">
                  <strong>{option.name ?? option.email}</strong>
                  <small>{option.email}</small>
                </span>
                <span className="admin-combobox-balance">{option.balance} cr.</span>
              </li>
            ))}
          </ul>
        ) : null}
        {selected ? (
          <small className="admin-combobox-hint">
            Solde actuel : <strong>{selected.balance}</strong> crédit{selected.balance > 1 ? "s" : ""}
          </small>
        ) : null}
      </div>

      <label className="admin-editor-field">
        <span>{mode === "add" ? "Crédits à ajouter" : "Crédits à retirer"}</span>
        <input
          type="number"
          name="amount"
          min="1"
          max="1000000"
          step="1"
          required
          placeholder="0"
          inputMode="numeric"
        />
      </label>

      <div className="admin-editor-actions is-wide">
        <button type="submit" className={mode === "remove" ? "is-danger" : undefined}>
          <Icon i={mode === "add" ? "circle-plus" : "circle-minus"} size={17} />
          {mode === "add" ? "Ajouter au solde" : "Retirer du solde"}
        </button>
      </div>
    </AdminActionForm>
  );
}

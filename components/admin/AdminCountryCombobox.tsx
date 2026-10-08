"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Icon from "@/components/banani/Icon";

export type CountryComboboxOption = { code: string; name: string; flag: string };

/** Minuscules sans accents ni apostrophes typographiques : « cote d ivoire » trouve « Côte d’Ivoire ». */
function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’'`-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Sélecteur de pays avec recherche : aucun pays n'est choisi par défaut. Un clic ouvre la liste, la saisie filtre en même
 * temps (nom, code pays ou indicatif), Entrée ou un clic choisit. `name` porte le code pays choisi (champ caché du
 * formulaire) ; `onSelect` permet de pré-remplir les champs voisins.
 */
export default function AdminCountryCombobox({
  name,
  options,
  ariaLabel,
  placeholder = "Rechercher un pays…",
  onSelect,
  onTouched,
}: {
  name: string;
  options: readonly CountryComboboxOption[];
  ariaLabel: string;
  placeholder?: string;
  onSelect?: (option: CountryComboboxOption) => void;
  /** Appelé quand le champ perd le focus (pour afficher « Choisis un pays » si rien n'est sélectionné). */
  onTouched?: () => void;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<CountryComboboxOption | null>(null);
  const [highlighted, setHighlighted] = useState(0);

  const filtered = useMemo(() => {
    const needle = normalize(query);
    if (!needle) return options;
    return options.filter((option) => normalize(`${option.name} ${option.code}`).includes(needle));
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    document.getElementById(`${listId}-${highlighted}`)?.scrollIntoView({ block: "nearest" });
  }, [highlighted, listId, open]);

  // Le champ visible est requis tant qu'aucun pays n'est choisi (message natif du navigateur).
  useEffect(() => {
    inputRef.current?.setCustomValidity(selected ? "" : "Choisis un pays dans la liste.");
  }, [selected]);

  function choose(option: CountryComboboxOption) {
    setSelected(option);
    setQuery("");
    setOpen(false);
    onSelect?.(option);
    inputRef.current?.blur();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setHighlighted((index) => Math.min(filtered.length - 1, index + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((index) => Math.max(0, index - 1));
    } else if (event.key === "Enter" && open) {
      event.preventDefault();
      const option = filtered[highlighted];
      if (option) choose(option);
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
      setQuery("");
    }
  }

  const shownValue = open ? query : selected ? `${selected.flag} ${selected.name}` : "";

  return (
    <div className={`admin-combobox ${open ? "is-open" : ""}`} ref={rootRef}>
      <input type="hidden" name={name} value={selected?.code ?? ""} />
      <div className="admin-combobox-field">
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-label={ariaLabel}
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && filtered[highlighted] ? `${listId}-${highlighted}` : undefined}
          autoComplete="off"
          required
          placeholder={selected ? `${selected.flag} ${selected.name}` : placeholder}
          value={shownValue}
          onFocus={() => {
            setOpen(true);
            setHighlighted(
              Math.max(
                0,
                filtered.findIndex((option) => option.code === selected?.code),
              ),
            );
          }}
          onClick={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setHighlighted(0);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => onTouched?.()}
        />
        <Icon i="chevron-down" size={16} />
      </div>
      {open ? (
        <ul className="admin-combobox-menu" id={listId} role="listbox" aria-label={ariaLabel}>
          {filtered.length === 0 ? (
            <li className="admin-combobox-empty" role="presentation">
              Aucun pays ne correspond à « {query} ».
            </li>
          ) : (
            filtered.map((option, index) => (
              <li
                key={option.code}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={selected?.code === option.code}
                className={index === highlighted ? "is-highlighted" : undefined}
                onMouseEnter={() => setHighlighted(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(option)}
              >
                <span>
                  {option.flag} {option.name}
                </span>
                <small>{option.code}</small>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}

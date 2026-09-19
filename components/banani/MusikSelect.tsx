"use client";

import { useEffect, useId, useRef, useState } from "react";
import Icon from "./Icon";

export type MusikSelectOption = {
  value: string;
  label: string;
  display?: string;
};

export default function MusikSelect({
  value,
  options,
  onChange,
  ariaLabel,
  placeholder = "Sélectionner",
  icon,
  className = "",
  showOptionLabels = true,
  showOptionDisplays = true,
}: {
  value: string;
  options: readonly MusikSelectOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  placeholder?: string;
  icon?: string;
  className?: string;
  showOptionLabels?: boolean;
  showOptionDisplays?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(() =>
    Math.max(
      0,
      options.findIndex((option) => option.value === value),
    ),
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    menuRef.current?.focus();
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [open]);

  const choose = (nextValue: string) => {
    onChange(nextValue);
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const openMenu = (index?: number) => {
    const current = options.findIndex((option) => option.value === value);
    setHighlighted(index ?? Math.max(0, current));
    setOpen(true);
  };

  return (
    <div ref={rootRef} className={`musik-select ${open ? "is-open" : ""} ${className}`.trim()}>
      <button
        ref={triggerRef}
        type="button"
        className="musik-select-trigger"
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            openMenu(Math.min(options.length - 1, highlighted + 1));
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            openMenu(Math.max(0, highlighted - 1));
          }
        }}
      >
        {icon && <Icon i={icon} size={16} className="musik-select-leading-icon" />}
        <span className="musik-select-value">{selected?.display ?? selected?.label ?? placeholder}</span>
        <Icon i="chevron-down" size={14} className="musik-select-chevron" />
      </button>

      {open && (
        <div
          ref={menuRef}
          id={menuId}
          className="musik-select-menu"
          role="listbox"
          aria-label={ariaLabel}
          tabIndex={-1}
          aria-activedescendant={`${menuId}-option-${highlighted}`}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setHighlighted((index) => Math.min(options.length - 1, index + 1));
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setHighlighted((index) => Math.max(0, index - 1));
            }
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              choose(options[highlighted].value);
            }
            if (event.key === "Escape") {
              event.preventDefault();
              setOpen(false);
              triggerRef.current?.focus();
            }
          }}
        >
          {options.map((option, index) => (
            <button
              id={`${menuId}-option-${index}`}
              key={option.value}
              type="button"
              role="option"
              aria-label={option.label}
              aria-selected={option.value === value}
              className={`musik-select-option ${index === highlighted ? "is-highlighted" : ""}`}
              onPointerMove={() => setHighlighted(index)}
              onClick={() => choose(option.value)}
            >
              {showOptionDisplays && option.display && (
                <span className="musik-select-option-display">{option.display}</span>
              )}
              {showOptionLabels && <span>{option.label}</span>}
              {option.value === value && <Icon i="check" size={15} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

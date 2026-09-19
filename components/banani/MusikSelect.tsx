"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  showSelectionMark = true,
  portal = false,
  portalWidth,
  menuClassName = "",
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
  showSelectionMark?: boolean;
  portal?: boolean;
  portalWidth?: number;
  menuClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(() =>
    Math.max(
      0,
      options.findIndex((option) => option.value === value),
    ),
  );
  const [portalPosition, setPortalPosition] = useState({ top: 0, left: 0, width: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    menuRef.current?.focus();
    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    const closeOnViewportChange = (event: Event) => {
      const target = event.target;
      if (target instanceof Node && menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    window.addEventListener("resize", closeOnViewportChange);
    window.addEventListener("scroll", closeOnViewportChange, true);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      window.removeEventListener("resize", closeOnViewportChange);
      window.removeEventListener("scroll", closeOnViewportChange, true);
    };
  }, [open]);

  const choose = (nextValue: string) => {
    onChange(nextValue);
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const openMenu = (index?: number) => {
    const current = options.findIndex((option) => option.value === value);
    if (portal && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const width = portalWidth ?? rect.width;
      setPortalPosition({
        top: rect.bottom + 7,
        left: Math.min(window.innerWidth - width - 8, Math.max(8, rect.right - width)),
        width,
      });
    }
    setHighlighted(index ?? Math.max(0, current));
    setOpen(true);
  };

  const menu = open ? (
    <div
      ref={menuRef}
      id={menuId}
      className={`musik-select-menu ${portal ? "is-portaled" : ""} ${menuClassName}`.trim()}
      style={portal ? portalPosition : undefined}
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
          {showSelectionMark && option.value === value && <Icon i="check" size={15} />}
        </button>
      ))}
    </div>
  ) : null;

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

      {portal && typeof document !== "undefined" ? createPortal(menu, document.body) : menu}
    </div>
  );
}

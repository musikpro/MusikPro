"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/banani/Icon";

export type AdminSelectOption = {
  value: string;
  label: string;
};

type AdminSelectProps = {
  ariaLabel: string;
  options: readonly AdminSelectOption[];
  name?: string;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
};

export default function AdminSelect({
  ariaLabel,
  options,
  name,
  defaultValue,
  value,
  onValueChange,
  className = "",
}: AdminSelectProps) {
  const fallbackValue = defaultValue ?? options[0]?.value ?? "";
  const [internalValue, setInternalValue] = useState(fallbackValue);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(() =>
    Math.max(
      0,
      options.findIndex((item) => item.value === fallbackValue),
    ),
  );
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const currentValue = value ?? internalValue;
  const selected = options.find((item) => item.value === currentValue) ?? options[0];

  const placeMenu = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const longestLabel = options.reduce((length, option) => Math.max(length, option.label.length), 0);
    const comfortableWidth = Math.max(180, longestLabel * 8 + 58);
    const width = Math.min(window.innerWidth - 16, Math.max(rect.width, Math.min(280, comfortableWidth)));
    const availableBelow = window.innerHeight - rect.bottom - 12;
    const estimatedHeight = Math.min(280, options.length * 48 + 12);
    const openAbove = availableBelow < Math.min(180, estimatedHeight) && rect.top > availableBelow;
    setMenuPosition({
      top: openAbove ? Math.max(8, rect.top - estimatedHeight - 7) : rect.bottom + 7,
      left: Math.min(Math.max(8, rect.left), Math.max(8, window.innerWidth - width - 8)),
      width,
    });
  };

  const openMenu = (index?: number) => {
    placeMenu();
    const selectedIndex = options.findIndex((item) => item.value === currentValue);
    setHighlighted(index ?? Math.max(0, selectedIndex));
    setOpen(true);
  };

  const choose = (nextValue: string) => {
    if (value === undefined) setInternalValue(nextValue);
    onValueChange?.(nextValue);
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

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

  const menu = open ? (
    <div
      ref={menuRef}
      id={menuId}
      className="admin-select-menu"
      style={menuPosition}
      role="listbox"
      aria-label={ariaLabel}
      aria-activedescendant={`${menuId}-option-${highlighted}`}
      tabIndex={-1}
      onKeyDown={(event) => {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          setHighlighted((index) => Math.min(options.length - 1, index + 1));
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          setHighlighted((index) => Math.max(0, index - 1));
        } else if (event.key === "Home") {
          event.preventDefault();
          setHighlighted(0);
        } else if (event.key === "End") {
          event.preventDefault();
          setHighlighted(Math.max(0, options.length - 1));
        } else if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          const option = options[highlighted];
          if (option) choose(option.value);
        } else if (event.key === "Escape" || event.key === "Tab") {
          setOpen(false);
          if (event.key === "Escape") {
            event.preventDefault();
            triggerRef.current?.focus();
          }
        }
      }}
    >
      {options.map((option, index) => (
        <button
          id={`${menuId}-option-${index}`}
          key={option.value}
          type="button"
          role="option"
          aria-selected={option.value === currentValue}
          className={index === highlighted ? "is-highlighted" : undefined}
          onPointerMove={() => setHighlighted(index)}
          onClick={() => choose(option.value)}
        >
          <span>{option.label}</span>
          {option.value === currentValue ? <Icon i="check" size={16} /> : null}
        </button>
      ))}
    </div>
  ) : null;

  return (
    <div ref={rootRef} className={`admin-select ${open ? "is-open" : ""} ${className}`.trim()}>
      {name ? <input type="hidden" name={name} value={currentValue} /> : null}
      <button
        ref={triggerRef}
        type="button"
        className="admin-select-trigger"
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            const selectedIndex = Math.max(
              0,
              options.findIndex((item) => item.value === currentValue),
            );
            openMenu(event.key === "ArrowUp" ? Math.max(0, selectedIndex - 1) : selectedIndex);
          }
        }}
      >
        <span>{selected?.label ?? "Sélectionner"}</span>
        <Icon i="chevron-down" size={15} />
      </button>
      {typeof document !== "undefined" ? createPortal(menu, document.body) : null}
    </div>
  );
}

"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "./Icon";
import { translate as t, translateTemplate } from "@/lib/i18n/translate";
import { currencyFlag, currencyName } from "@/lib/credit-plans/currency-flags";
import type { CreditCurrency } from "@/lib/credit-plans/currency";

/**
 * Sélecteur de monnaie du client : pastille « drapeau · code · AUTO » ; la liste affiche le pays détecté, puis chaque
 * monnaie (drapeau, code, symbole, nom). « AUTO » signale que la monnaie vient de la détection du pays ; un choix manuel
 * le retire, et « Revenir à la détection » le remet.
 */
export default function CurrencySelect({
  currencies,
  value,
  onChange,
  auto,
  detectedCountry,
  detectedCurrency,
  onResetAuto,
  className = "",
}: {
  currencies: readonly CreditCurrency[];
  value: string;
  onChange: (code: string) => void;
  auto: boolean;
  detectedCountry: string | null;
  detectedCurrency: string | null;
  onResetAuto: () => void;
  className?: string;
}) {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const [position, setPosition] = useState({ top: 0, right: 0, width: 260 });

  const selectedIndex = Math.max(
    0,
    currencies.findIndex((currency) => currency.code === value),
  );
  const selected = currencies[selectedIndex];
  const flagFor = (code: string) => currencyFlag(code, detectedCountry, auto && code === detectedCurrency);
  const canReset = !auto && Boolean(detectedCurrency) && currencies.some((c) => c.code === detectedCurrency);

  function place() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(window.innerWidth - 16, 270);
    setPosition({
      top: rect.bottom + 8,
      right: Math.max(8, window.innerWidth - rect.right),
      width,
    });
  }

  function openMenu() {
    place();
    setHighlighted(selectedIndex);
    setOpen(true);
  }

  function choose(code: string) {
    onChange(code);
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  useEffect(() => {
    if (!open) return;
    menuRef.current?.focus();
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    const onViewportChange = (event: Event) => {
      const target = event.target;
      if (target instanceof Node && menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [open]);

  function onMenuKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlighted((index) => Math.min(currencies.length - 1, index + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((index) => Math.max(0, index - 1));
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const option = currencies[highlighted];
      if (option) choose(option.code);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  }

  if (!selected) return null;

  return (
    <div className={`currency-select ${open ? "is-open" : ""} ${className}`} ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="currency-select-trigger"
        aria-label={t("Devise")}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            openMenu();
          }
        }}
      >
        <span className="currency-select-flag" aria-hidden="true">
          {flagFor(selected.code)}
        </span>
        <span className="currency-select-code">{selected.code}</span>
        {auto ? <span className="currency-select-auto">{t("Auto")}</span> : null}
        <Icon i="chevron-down" size={15} className="currency-select-chevron" />
      </button>
      {open
        ? createPortal(
            <div
              ref={menuRef}
              id={menuId}
              className="currency-select-menu"
              role="listbox"
              aria-label={t("Devise")}
              tabIndex={-1}
              aria-activedescendant={`${menuId}-${highlighted}`}
              style={{ top: position.top, right: position.right, width: position.width }}
              onKeyDown={onMenuKeyDown}
            >
              {detectedCountry ? (
                <div className="currency-select-detected" role="presentation">
                  <Icon i="globe" size={16} />
                  <span>{translateTemplate("Détecté depuis : {country}", { country: detectedCountry })}</span>
                </div>
              ) : null}
              {currencies.map((currency, index) => (
                <button
                  key={currency.code}
                  id={`${menuId}-${index}`}
                  type="button"
                  role="option"
                  tabIndex={-1}
                  aria-selected={currency.code === value}
                  className={index === highlighted ? "is-highlighted" : undefined}
                  onMouseEnter={() => setHighlighted(index)}
                  onClick={() => choose(currency.code)}
                >
                  <span className="currency-select-option-flag" aria-hidden="true">
                    {flagFor(currency.code)}
                  </span>
                  <span className="currency-select-option-text">
                    <span className="currency-select-option-line">
                      <strong>{currency.code}</strong>
                      <small>{currency.symbol}</small>
                    </span>
                    <span className="currency-select-option-name">{currencyName(currency.label)}</span>
                  </span>
                  {currency.code === value ? <Icon i="check" size={18} className="currency-select-check" /> : null}
                </button>
              ))}
              {canReset ? (
                <button
                  type="button"
                  className="currency-select-reset"
                  onClick={() => {
                    onResetAuto();
                    setOpen(false);
                  }}
                >
                  <Icon i="refresh-cw" size={14} />
                  {t("Revenir à la détection automatique")}
                </button>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

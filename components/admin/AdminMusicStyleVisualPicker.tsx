"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/banani/Icon";
import {
  MUSIC_STYLE_ICONS,
  MUSIC_STYLE_TONES,
  isMusicStyleIcon,
  isMusicStyleTone,
  type MusicStyleIcon,
  type MusicStyleTone,
} from "@/lib/music-styles/catalog";

const toneLabels: Record<MusicStyleTone, string> = {
  orange: "Orange",
  coral: "Corail",
  red: "Rouge",
  rose: "Rose",
  pink: "Fuchsia",
  violet: "Violet",
  indigo: "Indigo",
  blue: "Bleu",
  cyan: "Cyan",
  teal: "Turquoise",
  green: "Vert",
  lime: "Citron vert",
  amber: "Ambre",
  yellow: "Jaune",
  slate: "Ardoise",
};

const toneColors: Record<MusicStyleTone, string> = {
  orange: "#d95012",
  coral: "#d95536",
  red: "#c83b3b",
  rose: "#c34570",
  pink: "#c43d8b",
  violet: "#7950c7",
  indigo: "#4d5bc4",
  blue: "#2769be",
  cyan: "#157c96",
  teal: "#147e71",
  green: "#138654",
  lime: "#59831b",
  amber: "#a9670d",
  yellow: "#967215",
  slate: "#526372",
};

function iconLabel(value: MusicStyleIcon) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

type VisualPickerProps =
  | { kind: "icon"; value: MusicStyleIcon; onValueChange: (value: MusicStyleIcon) => void }
  | { kind: "tone"; value: MusicStyleTone; onValueChange: (value: MusicStyleTone) => void };

function VisualPickerDropdown(props: VisualPickerProps) {
  const { kind, value } = props;
  const options = kind === "icon" ? MUSIC_STYLE_ICONS : MUSIC_STYLE_TONES;
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(() => Math.max(0, options.indexOf(value as never)));
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const label = kind === "icon" ? iconLabel(value as MusicStyleIcon) : toneLabels[value as MusicStyleTone];

  const placeMenu = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(window.innerWidth - 16, Math.max(rect.width, kind === "icon" ? 430 : 390));
    const estimatedHeight = kind === "icon" ? 330 : 250;
    const availableBelow = window.innerHeight - rect.bottom - 12;
    const openAbove = availableBelow < Math.min(220, estimatedHeight) && rect.top > availableBelow;
    setPosition({
      top: openAbove ? Math.max(8, rect.top - estimatedHeight - 7) : rect.bottom + 7,
      left: Math.min(Math.max(8, rect.left), Math.max(8, window.innerWidth - width - 8)),
      width,
    });
  };

  const openMenu = () => {
    placeMenu();
    setHighlighted(Math.max(0, options.indexOf(value as never)));
    setOpen(true);
  };

  const choose = (index: number) => {
    const nextValue = options[index];
    if (!nextValue) return;
    if (kind === "icon") props.onValueChange(nextValue as MusicStyleIcon);
    else props.onValueChange(nextValue as MusicStyleTone);
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
      className={`admin-visual-select-menu is-${kind}`}
      style={position}
      role="listbox"
      aria-label={kind === "icon" ? "Icône du style musical" : "Couleur du style musical"}
      aria-activedescendant={`${menuId}-option-${highlighted}`}
      tabIndex={-1}
      onKeyDown={(event) => {
        const columns = kind === "icon" ? 6 : 3;
        if (
          !["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Home", "End", "Enter", " ", "Escape", "Tab"].includes(
            event.key,
          )
        )
          return;
        if (event.key !== "Tab") event.preventDefault();
        if (event.key === "ArrowDown") setHighlighted((index) => Math.min(options.length - 1, index + columns));
        else if (event.key === "ArrowUp") setHighlighted((index) => Math.max(0, index - columns));
        else if (event.key === "ArrowRight") setHighlighted((index) => Math.min(options.length - 1, index + 1));
        else if (event.key === "ArrowLeft") setHighlighted((index) => Math.max(0, index - 1));
        else if (event.key === "Home") setHighlighted(0);
        else if (event.key === "End") setHighlighted(options.length - 1);
        else if (event.key === "Enter" || event.key === " ") choose(highlighted);
        else {
          setOpen(false);
          if (event.key === "Escape") triggerRef.current?.focus();
        }
      }}
    >
      <div className={kind === "icon" ? "admin-visual-icon-grid" : "admin-visual-tone-grid"}>
        {options.map((option, index) => {
          const selected = option === value;
          const optionLabel =
            kind === "icon" ? iconLabel(option as MusicStyleIcon) : toneLabels[option as MusicStyleTone];
          return (
            <button
              id={`${menuId}-option-${index}`}
              key={option}
              type="button"
              role="option"
              aria-selected={selected}
              aria-label={optionLabel}
              title={optionLabel}
              className={`${index === highlighted ? "is-highlighted" : ""} ${selected ? "is-selected" : ""} ${kind === "tone" ? `genre-choice-icon-${option}` : ""}`}
              style={
                kind === "tone"
                  ? {
                      color: toneColors[option as MusicStyleTone],
                      background: `${toneColors[option as MusicStyleTone]}14`,
                    }
                  : undefined
              }
              onPointerMove={() => setHighlighted(index)}
              onClick={() => choose(index)}
            >
              {kind === "icon" ? (
                <>
                  <Icon i={option} size={20} />
                  <small>{optionLabel}</small>
                </>
              ) : (
                <>
                  <span aria-hidden="true" />
                  <small>{optionLabel}</small>
                  {selected ? <Icon i="check" size={14} /> : null}
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  ) : null;

  return (
    <div ref={rootRef} className={`admin-visual-select ${open ? "is-open" : ""}`}>
      <button
        ref={triggerRef}
        type="button"
        className="admin-visual-select-trigger"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={kind === "icon" ? "Choisir l’icône" : "Choisir la couleur"}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={(event) => {
          if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
            event.preventDefault();
            openMenu();
          }
        }}
      >
        <span
          className={
            kind === "tone" ? `admin-visual-trigger-swatch genre-choice-icon-${value}` : "admin-visual-trigger-icon"
          }
          style={
            kind === "tone"
              ? { color: toneColors[value as MusicStyleTone], background: `${toneColors[value as MusicStyleTone]}14` }
              : undefined
          }
        >
          {kind === "icon" ? <Icon i={value} size={20} /> : <span aria-hidden="true" />}
        </span>
        <span className="admin-visual-trigger-copy">
          <small>{kind === "icon" ? "Icône sélectionnée" : "Couleur sélectionnée"}</small>
          <strong>{label}</strong>
        </span>
        <Icon i={open ? "chevron-up" : "chevron-down"} size={17} />
      </button>
      {typeof document !== "undefined" ? createPortal(menu, document.body) : null}
    </div>
  );
}

export default function AdminMusicStyleVisualPicker({
  defaultIcon = "music-2",
  defaultTone = "orange",
}: {
  defaultIcon?: string;
  defaultTone?: string;
}) {
  const [icon, setIcon] = useState<MusicStyleIcon>(isMusicStyleIcon(defaultIcon) ? defaultIcon : "music-2");
  const [tone, setTone] = useState<MusicStyleTone>(isMusicStyleTone(defaultTone) ? defaultTone : "orange");
  return (
    <div className="admin-style-visual-picker admin-editor-field is-wide">
      <input type="hidden" name="icon" value={icon} />
      <input type="hidden" name="tone" value={tone} />
      <div className="admin-style-dropdown-grid">
        <div className="admin-style-dropdown-field">
          <span>Icône</span>
          <p>Déroule la liste pour choisir parmi {MUSIC_STYLE_ICONS.length} icônes.</p>
          <VisualPickerDropdown kind="icon" value={icon} onValueChange={setIcon} />
        </div>
        <div className="admin-style-dropdown-field">
          <span>Couleur</span>
          <p>Déroule la liste pour choisir la couleur de la carte.</p>
          <VisualPickerDropdown kind="tone" value={tone} onValueChange={setTone} />
        </div>
      </div>
      <div className="admin-style-picker-preview">
        <span className={`admin-catalog-icon genre-choice-icon-${tone}`}>
          <Icon i={icon} size={22} />
        </span>
        <div>
          <small>Aperçu</small>
          <strong>
            {iconLabel(icon)} · {toneLabels[tone]}
          </strong>
        </div>
      </div>
    </div>
  );
}

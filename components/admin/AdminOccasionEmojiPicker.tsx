"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/banani/Icon";
import { isOccasionEmoji, OCCASION_EMOJI_OPTIONS, type OccasionEmoji } from "@/lib/occasions/catalog";

export default function AdminOccasionEmojiPicker({ defaultEmoji = "🎉" }: { defaultEmoji?: string }) {
  const [emoji, setEmoji] = useState<OccasionEmoji>(isOccasionEmoji(defaultEmoji) ? defaultEmoji : "🎉");
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(() =>
    Math.max(
      0,
      OCCASION_EMOJI_OPTIONS.findIndex((option) => option.value === defaultEmoji),
    ),
  );
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const selected = OCCASION_EMOJI_OPTIONS.find((option) => option.value === emoji) ?? OCCASION_EMOJI_OPTIONS[3];

  const placeMenu = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(window.innerWidth - 16, Math.max(rect.width, 520));
    const estimatedHeight = 360;
    const availableBelow = window.innerHeight - rect.bottom - 12;
    const openAbove = availableBelow < 240 && rect.top > availableBelow;
    setPosition({
      top: openAbove ? Math.max(8, rect.top - estimatedHeight - 7) : rect.bottom + 7,
      left: Math.min(Math.max(8, rect.left), Math.max(8, window.innerWidth - width - 8)),
      width,
    });
  };

  const openMenu = () => {
    placeMenu();
    setHighlighted(
      Math.max(
        0,
        OCCASION_EMOJI_OPTIONS.findIndex((option) => option.value === emoji),
      ),
    );
    setOpen(true);
  };
  const choose = (index: number) => {
    const option = OCCASION_EMOJI_OPTIONS[index];
    if (!option) return;
    setEmoji(option.value);
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  useEffect(() => {
    if (!open) return;
    menuRef.current?.focus();
    const closeOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    const closeOnViewportChange = (event: Event) => {
      if (event.target instanceof Node && menuRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    window.addEventListener("resize", closeOnViewportChange);
    window.addEventListener("scroll", closeOnViewportChange, true);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      window.removeEventListener("resize", closeOnViewportChange);
      window.removeEventListener("scroll", closeOnViewportChange, true);
    };
  }, [open]);

  const menu = open ? (
    <div
      ref={menuRef}
      id={menuId}
      className="admin-visual-select-menu is-emoji"
      style={position}
      role="listbox"
      aria-label="Emoji de l’occasion"
      aria-activedescendant={`${menuId}-option-${highlighted}`}
      tabIndex={-1}
      onKeyDown={(event) => {
        const columns = window.innerWidth < 520 ? 4 : 6;
        if (
          !["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Home", "End", "Enter", " ", "Escape", "Tab"].includes(
            event.key,
          )
        )
          return;
        if (event.key !== "Tab") event.preventDefault();
        if (event.key === "ArrowDown")
          setHighlighted((index) => Math.min(OCCASION_EMOJI_OPTIONS.length - 1, index + columns));
        else if (event.key === "ArrowUp") setHighlighted((index) => Math.max(0, index - columns));
        else if (event.key === "ArrowRight")
          setHighlighted((index) => Math.min(OCCASION_EMOJI_OPTIONS.length - 1, index + 1));
        else if (event.key === "ArrowLeft") setHighlighted((index) => Math.max(0, index - 1));
        else if (event.key === "Home") setHighlighted(0);
        else if (event.key === "End") setHighlighted(OCCASION_EMOJI_OPTIONS.length - 1);
        else if (event.key === "Enter" || event.key === " ") choose(highlighted);
        else {
          setOpen(false);
          if (event.key === "Escape") triggerRef.current?.focus();
        }
      }}
    >
      <div className="admin-visual-icon-grid admin-visual-emoji-grid">
        {OCCASION_EMOJI_OPTIONS.map((option, index) => (
          <button
            id={`${menuId}-option-${index}`}
            key={`${option.value}-${option.label}`}
            type="button"
            role="option"
            aria-selected={option.value === emoji}
            aria-label={option.label}
            title={option.label}
            className={`${index === highlighted ? "is-highlighted" : ""} ${option.value === emoji ? "is-selected" : ""}`}
            onPointerMove={() => setHighlighted(index)}
            onClick={() => choose(index)}
          >
            <span aria-hidden="true">{option.value}</span>
            <small>{option.label}</small>
          </button>
        ))}
      </div>
    </div>
  ) : null;

  return (
    <div className="admin-style-visual-picker admin-editor-field">
      <input type="hidden" name="emoji" value={emoji} />
      <div className="admin-style-dropdown-field">
        <span>Emoji</span>
        <p>Déroule la liste pour choisir parmi {OCCASION_EMOJI_OPTIONS.length} emojis adaptés aux occasions.</p>
        <div ref={rootRef} className={`admin-visual-select ${open ? "is-open" : ""}`}>
          <button
            ref={triggerRef}
            type="button"
            className="admin-visual-select-trigger"
            role="combobox"
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={menuId}
            aria-label="Choisir l’emoji de l’occasion"
            onClick={() => (open ? setOpen(false) : openMenu())}
            onKeyDown={(event) => {
              if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
                event.preventDefault();
                openMenu();
              }
            }}
          >
            <span className="admin-visual-trigger-icon admin-emoji-trigger" aria-hidden="true">
              {selected.value}
            </span>
            <span className="admin-visual-trigger-copy">
              <small>Emoji sélectionné</small>
              <strong>{selected.label}</strong>
            </span>
            <Icon i={open ? "chevron-up" : "chevron-down"} size={17} />
          </button>
          {typeof document !== "undefined" ? createPortal(menu, document.body) : null}
        </div>
      </div>
      <div className="admin-style-picker-preview admin-occasion-picker-preview">
        <span className="admin-catalog-icon admin-occasion-emoji" aria-hidden="true">
          {selected.value}
        </span>
        <div>
          <small>Aperçu</small>
          <strong>{selected.label}</strong>
        </div>
      </div>
    </div>
  );
}

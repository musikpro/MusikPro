"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/banani/Icon";
import { toggleGuestLinkAction, trashGuestLinkAction } from "@/app/admin/guest-links/actions";
import AdminActionForm from "./AdminActionForm";
import AdminCopyLinkButton from "./AdminCopyLinkButton";
import AdminTrashGuestLinkButton from "./AdminTrashGuestLinkButton";

/** Hauteur estimée du menu déroulant (deux entrées), pour choisir s'il s'ouvre vers le bas ou vers le haut. */
const MENU_HEIGHT = 100;

/**
 * Actions d'une ligne de « Liens du mode invité » : les deux gestes courants (Copier, Modifier) restent visibles,
 * les autres (Désactiver/Activer, Supprimer) se déroulent dans un menu « Plus ». Chaque action passe par
 * AdminActionForm : résultat toujours confirmé par le toast global.
 */
export default function AdminGuestLinkRowActions({
  id,
  label,
  url,
  active,
}: {
  id: string;
  label: string;
  url: string;
  active: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left?: number; right?: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const close = () => setOpen(false);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    // Le menu est en position fixe (le tableau défile et rognerait un menu absolu) : on le ferme dès que la page bouge.
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  return (
    <div className="admin-row-actions" ref={rootRef}>
      <AdminCopyLinkButton url={url} />
      <Link className="admin-row-action" href={`/admin/guest-links/${id}`}>
        <Icon i="pencil" size={15} /> Modifier
      </Link>
      <div className="admin-row-menu">
        <button
          type="button"
          className="admin-row-action admin-row-action-icon"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={menuId}
          aria-label={`Plus d’actions pour le lien ${label}`}
          ref={triggerRef}
          onClick={() => {
            // Le menu est rendu dans le conteneur racine de l'admin (jamais rogné par le tableau) : on le repère ici.
            setPortalTarget(triggerRef.current?.closest<HTMLElement>(".admin-app") ?? document.body);
            const rect = triggerRef.current?.getBoundingClientRect();
            if (rect) {
              // Ouvre vers le haut quand il n'y a pas la place dessous (bas d'écran, téléphone).
              const below = rect.bottom + 6;
              const top = below + MENU_HEIGHT > window.innerHeight ? Math.max(8, rect.top - MENU_HEIGHT - 6) : below;
              // Ancré au bord droit du bouton (ordinateur) ou à son bord gauche quand il est dans la moitié gauche (téléphone).
              setPosition(
                rect.left > window.innerWidth / 2
                  ? { top, right: Math.max(8, window.innerWidth - rect.right) }
                  : { top, left: Math.max(8, rect.left) },
              );
            }
            setOpen((value) => !value);
          }}
        >
          <Icon i="ellipsis" size={17} />
        </button>
        {portalTarget
          ? createPortal(
              <div
                ref={menuRef}
                id={menuId}
                role="menu"
                className="admin-row-menu-panel"
                hidden={!open}
                style={position ?? undefined}
              >
                <AdminActionForm action={toggleGuestLinkAction} onSuccess={() => setOpen(false)}>
                  <input type="hidden" name="id" value={id} />
                  <input type="hidden" name="active" value={String(active)} />
                  <button className="admin-row-menu-item" type="submit" role="menuitem">
                    <Icon i={active ? "pause" : "play"} size={15} />
                    {active ? "Désactiver" : "Activer"}
                  </button>
                </AdminActionForm>
                <AdminActionForm action={trashGuestLinkAction} onSuccess={() => setOpen(false)}>
                  <input type="hidden" name="id" value={id} />
                  <AdminTrashGuestLinkButton label={label} variant="menu" />
                </AdminActionForm>
              </div>,
              portalTarget,
            )
          : null}
      </div>
    </div>
  );
}

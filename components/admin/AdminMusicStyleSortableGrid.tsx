"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { deleteMusicStyle, reorderMusicStyles, toggleMusicStyle } from "@/app/admin/music-styles/actions";
import Icon from "@/components/banani/Icon";
import AdminDeleteMusicStyleButton from "./AdminDeleteMusicStyleButton";

export type SortableMusicStyle = {
  id: string;
  name: string;
  description: string;
  icon: string;
  tone: string;
  active: boolean;
  sortOrder: number;
};

type DragPreview = {
  style: SortableMusicStyle;
  x: number;
  y: number;
  offsetX: number;
  offsetY: number;
  width: number;
};

function moveItem(items: SortableMusicStyle[], activeId: string, targetId: string) {
  const from = items.findIndex((item) => item.id === activeId);
  const to = items.findIndex((item) => item.id === targetId);
  if (from < 0 || to < 0 || from === to) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export default function AdminMusicStyleSortableGrid({ styles }: { styles: SortableMusicStyle[] }) {
  const [items, setItems] = useState(styles);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);
  const [isPending, startTransition] = useTransition();
  const itemsRef = useRef(styles);
  const pointerDrag = useRef<{
    id: string;
    pointerId: number;
    previous: SortableMusicStyle[];
  } | null>(null);
  const pointerTargetId = useRef<string | null>(null);
  const pointerListenersCleanup = useRef<(() => void) | null>(null);

  useEffect(
    () => () => {
      pointerListenersCleanup.current?.();
    },
    [],
  );

  const updateTarget = (id: string | null) => {
    pointerTargetId.current = id;
    setTargetId(id);
  };

  const resetDrag = () => {
    pointerDrag.current = null;
    pointerTargetId.current = null;
    setDraggedId(null);
    setTargetId(null);
    setDragPreview(null);
  };

  const persist = (next: SortableMusicStyle[], previous: SortableMusicStyle[]) => {
    itemsRef.current = next;
    setItems(next);
    setSaved(false);
    setSaveError(false);
    const formData = new FormData();
    formData.set("order", JSON.stringify(next.map((style) => style.id)));
    startTransition(async () => {
      try {
        await reorderMusicStyles(formData);
        setSaved(true);
        window.setTimeout(() => setSaved(false), 2200);
      } catch {
        itemsRef.current = previous;
        setItems(previous);
        setSaveError(true);
      }
    });
  };

  const moveAndPersist = (activeId: string, overId: string) => {
    const previous = itemsRef.current;
    const next = moveItem(previous, activeId, overId);
    if (next !== previous) persist(next, previous);
  };

  const moveWhileDragging = (activeId: string, overId: string) => {
    setItems((current) => {
      const next = moveItem(current, activeId, overId);
      itemsRef.current = next;
      return next;
    });
  };

  return (
    <>
      <div className="admin-sort-status" aria-live="polite">
        <Icon i="grip-vertical" size={15} />
        <span>
          {isPending
            ? "Enregistrement du nouvel ordre…"
            : saveError
              ? "L’ordre n’a pas pu être enregistré. La liste précédente a été restaurée."
              : saved
                ? "Nouvel ordre enregistré"
                : "Saisis une carte par sa poignée pour changer l’ordre."}
        </span>
      </div>
      <section className={`admin-catalog-grid admin-music-style-grid ${isPending ? "is-saving" : ""}`}>
        {items.map((style, index) => (
          <article
            className={`admin-catalog-card admin-music-style-card ${style.active ? "is-active" : ""} ${draggedId === style.id ? "is-dragging" : ""} ${targetId === style.id && draggedId !== style.id ? "is-drop-target" : ""}`}
            key={style.id}
            data-style-id={style.id}
          >
            <div className="admin-catalog-card-head">
              <span className={`admin-catalog-icon genre-choice-icon-${style.tone}`}>
                <Icon i={style.icon} size={21} />
              </span>
              <button
                type="button"
                className="admin-style-drag-handle"
                data-drag-handle
                aria-label={`Déplacer ${style.name}. Position ${index + 1} sur ${items.length}.`}
                title="Maintenir et glisser pour changer l’ordre"
                onPointerDown={(event) => {
                  if (isPending || event.button !== 0) return;
                  event.preventDefault();
                  const card = event.currentTarget.closest<HTMLElement>("[data-style-id]");
                  const rect = card?.getBoundingClientRect();
                  if (!rect) return;
                  pointerListenersCleanup.current?.();
                  const drag = {
                    id: style.id,
                    pointerId: event.pointerId,
                    previous: itemsRef.current,
                  };
                  pointerDrag.current = drag;

                  const cleanup = () => {
                    window.removeEventListener("pointermove", handlePointerMove, true);
                    window.removeEventListener("pointerup", finishDrag, true);
                    window.removeEventListener("pointercancel", cancelDrag, true);
                    window.removeEventListener("blur", cancelDrag, true);
                    document.removeEventListener("visibilitychange", handleVisibilityChange, true);
                    pointerListenersCleanup.current = null;
                  };

                  const cancelDrag = () => {
                    cleanup();
                    itemsRef.current = drag.previous;
                    setItems(drag.previous);
                    resetDrag();
                  };

                  const handleVisibilityChange = () => {
                    if (document.visibilityState === "hidden") cancelDrag();
                  };

                  const handlePointerMove = (pointerEvent: PointerEvent) => {
                    if (pointerDrag.current?.pointerId !== pointerEvent.pointerId) return;
                    pointerEvent.preventDefault();
                    setDragPreview((current) =>
                      current ? { ...current, x: pointerEvent.clientX, y: pointerEvent.clientY } : current,
                    );
                    const target = document
                      .elementFromPoint(pointerEvent.clientX, pointerEvent.clientY)
                      ?.closest<HTMLElement>("[data-style-id]");
                    const nextTargetId = target?.dataset.styleId;
                    if (nextTargetId && nextTargetId !== drag.id && nextTargetId !== pointerTargetId.current) {
                      updateTarget(nextTargetId);
                      moveWhileDragging(drag.id, nextTargetId);
                    }
                  };

                  const finishDrag = (pointerEvent: PointerEvent) => {
                    if (pointerDrag.current?.pointerId !== pointerEvent.pointerId) return;
                    pointerEvent.preventDefault();
                    const releaseTarget = document
                      .elementFromPoint(pointerEvent.clientX, pointerEvent.clientY)
                      ?.closest<HTMLElement>("[data-style-id]")?.dataset.styleId;
                    const next =
                      releaseTarget && releaseTarget !== drag.id
                        ? moveItem(itemsRef.current, drag.id, releaseTarget)
                        : itemsRef.current;
                    const changed = next.some((item, itemIndex) => item.id !== drag.previous[itemIndex]?.id);
                    cleanup();
                    itemsRef.current = next;
                    setItems(next);
                    resetDrag();
                    if (changed) persist(next, drag.previous);
                  };

                  window.addEventListener("pointermove", handlePointerMove, { capture: true, passive: false });
                  window.addEventListener("pointerup", finishDrag, { capture: true, passive: false });
                  window.addEventListener("pointercancel", cancelDrag, true);
                  window.addEventListener("blur", cancelDrag, true);
                  document.addEventListener("visibilitychange", handleVisibilityChange, true);
                  pointerListenersCleanup.current = cleanup;

                  setDraggedId(style.id);
                  setDragPreview({
                    style,
                    x: event.clientX,
                    y: event.clientY,
                    offsetX: event.clientX - rect.left,
                    offsetY: event.clientY - rect.top,
                    width: rect.width,
                  });
                }}
                onKeyDown={(event) => {
                  if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
                  event.preventDefault();
                  const targetIndex = event.key === "ArrowUp" ? index - 1 : index + 1;
                  const target = items[targetIndex];
                  if (target) moveAndPersist(style.id, target.id);
                }}
              >
                <Icon i="grip-vertical" size={20} />
              </button>
              <span className={`admin-status ${style.active ? "is-success" : "is-pending"}`}>
                {style.active ? "Actif" : "Désactivé"}
              </span>
            </div>
            <h2>{style.name}</h2>
            <p>{style.description}</p>
            <small>Ordre {index + 1}</small>
            <footer className="admin-style-actions">
              <Link className="admin-secondary-action admin-style-edit" href={`/admin/music-styles/${style.id}`}>
                <Icon i="pencil" size={15} /> Modifier
              </Link>
              <form action={toggleMusicStyle}>
                <input type="hidden" name="id" value={style.id} />
                <input type="hidden" name="active" value={String(style.active)} />
                <button className="admin-secondary-action" type="submit">
                  <Icon i={style.active ? "pause" : "play"} size={15} />
                  {style.active ? "Désactiver" : "Activer"}
                </button>
              </form>
              <form action={deleteMusicStyle}>
                <input type="hidden" name="id" value={style.id} />
                <AdminDeleteMusicStyleButton name={style.name} />
              </form>
            </footer>
          </article>
        ))}
      </section>
      {dragPreview ? (
        <div
          className="admin-style-drag-preview"
          aria-hidden="true"
          style={{
            left: dragPreview.x - dragPreview.offsetX,
            top: dragPreview.y - dragPreview.offsetY,
            width: dragPreview.width,
          }}
        >
          <span className={`admin-catalog-icon genre-choice-icon-${dragPreview.style.tone}`}>
            <Icon i={dragPreview.style.icon} size={21} />
          </span>
          <strong>{dragPreview.style.name}</strong>
          <Icon i="grip-vertical" size={18} />
        </div>
      ) : null}
    </>
  );
}

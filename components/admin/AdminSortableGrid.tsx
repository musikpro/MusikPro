"use client";

import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { useEffect, useRef, useState, useTransition } from "react";
import Icon from "@/components/banani/Icon";

type SortableItem = { id: string };
type DragPreview<T> = { item: T; x: number; y: number; offsetX: number; offsetY: number; width: number };
type RenderItemContext = {
  index: number;
  count: number;
  dragging: boolean;
  dropTarget: boolean;
};

function moveItem<T extends SortableItem>(items: T[], activeId: string, targetId: string) {
  const from = items.findIndex((item) => item.id === activeId);
  const to = items.findIndex((item) => item.id === targetId);
  if (from < 0 || to < 0 || from === to) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export default function AdminSortableGrid<T extends SortableItem>({
  items: initialItems,
  onReorder,
  className = "",
  itemLabel,
  renderItem,
  renderPreview,
}: {
  items: T[];
  onReorder: (formData: FormData) => Promise<void>;
  className?: string;
  itemLabel: (item: T) => string;
  renderItem: (item: T, context: RenderItemContext) => ReactNode;
  renderPreview: (item: T) => ReactNode;
}) {
  const [items, setItems] = useState(initialItems);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [dragPreview, setDragPreview] = useState<DragPreview<T> | null>(null);
  const [isPending, startTransition] = useTransition();
  const itemsRef = useRef(initialItems);
  const pointerDrag = useRef<{ id: string; pointerId: number; previous: T[] } | null>(null);
  const pointerTargetId = useRef<string | null>(null);
  const pointerListenersCleanup = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (pointerDrag.current || isPending) return;
    itemsRef.current = initialItems;
    setItems(initialItems);
  }, [initialItems, isPending]);
  useEffect(() => () => pointerListenersCleanup.current?.(), []);

  const resetDrag = () => {
    pointerDrag.current = null;
    pointerTargetId.current = null;
    setDraggedId(null);
    setTargetId(null);
    setDragPreview(null);
  };

  const persist = (next: T[], previous: T[]) => {
    itemsRef.current = next;
    setItems(next);
    setSaved(false);
    setSaveError(false);
    const formData = new FormData();
    formData.set("order", JSON.stringify(next.map((item) => item.id)));
    startTransition(async () => {
      try {
        await onReorder(formData);
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

  const startPointerDrag = (item: T, event: ReactPointerEvent<HTMLButtonElement>) => {
    if (isPending || event.button !== 0) return;
    event.preventDefault();
    const card = event.currentTarget.closest<HTMLElement>("[data-sortable-id]");
    const rect = card?.getBoundingClientRect();
    if (!rect) return;
    pointerListenersCleanup.current?.();
    const drag = { id: item.id, pointerId: event.pointerId, previous: itemsRef.current };
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
      setDragPreview((current) => current ? { ...current, x: pointerEvent.clientX, y: pointerEvent.clientY } : current);
      const nextTargetId = document
        .elementFromPoint(pointerEvent.clientX, pointerEvent.clientY)
        ?.closest<HTMLElement>("[data-sortable-id]")?.dataset.sortableId;
      if (!nextTargetId || nextTargetId === drag.id || nextTargetId === pointerTargetId.current) return;
      pointerTargetId.current = nextTargetId;
      setTargetId(nextTargetId);
      setItems((current) => {
        const next = moveItem(current, drag.id, nextTargetId);
        itemsRef.current = next;
        return next;
      });
    };
    const finishDrag = (pointerEvent: PointerEvent) => {
      if (pointerDrag.current?.pointerId !== pointerEvent.pointerId) return;
      pointerEvent.preventDefault();
      const releaseTarget = document
        .elementFromPoint(pointerEvent.clientX, pointerEvent.clientY)
        ?.closest<HTMLElement>("[data-sortable-id]")?.dataset.sortableId;
      const next = releaseTarget && releaseTarget !== drag.id
        ? moveItem(itemsRef.current, drag.id, releaseTarget)
        : itemsRef.current;
      const changed = next.some((current, index) => current.id !== drag.previous[index]?.id);
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
    setDraggedId(item.id);
    setDragPreview({
      item,
      x: event.clientX,
      y: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      width: rect.width,
    });
  };

  return (
    <>
      <div className="admin-sort-status" aria-live="polite">
        <Icon i="grip-vertical" size={15} />
        <span>{isPending ? "Enregistrement du nouvel ordre…" : saveError ? "L’ordre n’a pas pu être enregistré. La liste précédente a été restaurée." : saved ? "Nouvel ordre enregistré" : "Saisis une carte par sa poignée pour changer l’ordre."}</span>
      </div>
      <section className={`admin-catalog-grid ${className} ${isPending ? "is-saving" : ""}`}>
        {items.map((item, index) => (
          <div key={item.id} data-sortable-id={item.id}>
            {renderItem(item, {
              index,
              count: items.length,
              dragging: draggedId === item.id,
              dropTarget: targetId === item.id && draggedId !== item.id,
            })}
            <button
              type="button"
              className="admin-style-drag-handle admin-sortable-overlay-handle"
              aria-label={`Déplacer ${itemLabel(item)}. Position ${index + 1} sur ${items.length}.`}
              title="Maintenir et glisser pour changer l’ordre"
              disabled={isPending}
              onPointerDown={(event) => startPointerDrag(item, event)}
              onKeyDown={(event) => {
                if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
                event.preventDefault();
                const targetIndex = event.key === "ArrowUp" ? index - 1 : index + 1;
                const target = items[targetIndex];
                if (target) moveAndPersist(item.id, target.id);
              }}
            >
              <Icon i="grip-vertical" size={20} />
            </button>
          </div>
        ))}
      </section>
      {dragPreview ? (
        <div className="admin-style-drag-preview" aria-hidden="true" style={{ left: dragPreview.x - dragPreview.offsetX, top: dragPreview.y - dragPreview.offsetY, width: dragPreview.width } as CSSProperties}>
          {renderPreview(dragPreview.item)}
        </div>
      ) : null}
    </>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { buildCreationDraftPayload } from "./CreationDraftSync";
import { useDemo } from "./DemoProvider";
import { GUEST_DRAFT_KEY, isGuestDraftWorthKeeping, parseGuestDraft, serializeGuestDraft } from "@/lib/guest/draft";

const SAVE_DELAY_MS = 600;

/**
 * Brouillon du visiteur invité : reprend à l'ouverture ce qu'il avait saisi (histoire, noms, choix, détails) et
 * l'enregistre dans le navigateur à chaque changement. Rien n'est envoyé au serveur (le visiteur n'a pas de compte) :
 * le brouillon survit au rechargement et à la redirection de connexion, puis est repris une fois connecté. Ne rend rien.
 */
export default function GuestDraftSync() {
  const { isGuest, choices, fields, details, packIndex, restoreCreationDraft } = useDemo();
  const [ready, setReady] = useState(false);
  const restoreRef = useRef(restoreCreationDraft);
  useEffect(() => {
    restoreRef.current = restoreCreationDraft;
  });

  // Reprise unique à l'ouverture (avant toute sauvegarde, pour qu'un état vide n'écrase pas le brouillon).
  useEffect(() => {
    if (!isGuest) return;
    let active = true;
    let saved: ReturnType<typeof parseGuestDraft> = null;
    try {
      saved = parseGuestDraft(window.localStorage.getItem(GUEST_DRAFT_KEY));
    } catch {
      // Stockage bloqué : le parcours continue sans brouillon.
    }
    window.queueMicrotask(() => {
      if (!active) return;
      if (saved) restoreRef.current(saved);
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, [isGuest]);

  const { data } = buildCreationDraftPayload("story", { choices, fields, details, packIndex });
  const worthKeeping = isGuestDraftWorthKeeping(data);
  const serialized = JSON.stringify(data);

  useEffect(() => {
    if (!isGuest || !ready) return;
    const timer = window.setTimeout(() => {
      try {
        if (worthKeeping) window.localStorage.setItem(GUEST_DRAFT_KEY, serializeGuestDraft(JSON.parse(serialized)));
        else window.localStorage.removeItem(GUEST_DRAFT_KEY);
      } catch {
        // Stockage plein ou bloqué : ne jamais interrompre la création.
      }
    }, SAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [isGuest, ready, worthKeeping, serialized]);

  return null;
}

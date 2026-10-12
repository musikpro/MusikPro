"use client";

import { useEffect } from "react";
import { buildCreationDraftPayload } from "./CreationDraftSync";
import { GUEST_DRAFT_KEY, isGuestDraftWorthKeeping, parseGuestDraft } from "@/lib/guest/draft";
import { GUEST_RESUME_COOKIE } from "@/lib/guest/resume";
import { creationDraftSaveSchema } from "@/lib/validation/creation-draft";

/**
 * Compte connecté qui arrive d'un lien invité : verse le brouillon gardé dans le navigateur vers le brouillon du compte
 * (l'écran « Reprendre ou recommencer » le propose alors), puis recharge la page une seule fois. Ne rend rien. Rien
 * n'est fait sans le cookie de reprise posé par le portail ; en cas d'échec, le brouillon local est conservé.
 */
export default function GuestDraftMigrate() {
  useEffect(() => {
    if (!document.cookie.split("; ").some((entry) => entry.startsWith(`${GUEST_RESUME_COOKIE}=`))) return;
    const clearCookie = () => {
      document.cookie = `${GUEST_RESUME_COOKIE}=; path=/; max-age=0; samesite=lax`;
    };
    let draft: ReturnType<typeof parseGuestDraft> = null;
    try {
      draft = parseGuestDraft(window.localStorage.getItem(GUEST_DRAFT_KEY));
    } catch {
      // Stockage bloqué : rien à reprendre.
    }
    if (!draft || !isGuestDraftWorthKeeping(draft)) {
      clearCookie();
      return;
    }
    const save = creationDraftSaveSchema.safeParse(
      buildCreationDraftPayload("parameters", {
        choices: draft.choices,
        fields: draft.fields,
        details: draft.details,
        packIndex: draft.packIndex,
      }),
    );
    if (!save.success) {
      clearCookie();
      return;
    }
    void fetch("/api/creation-draft", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(save.data),
      credentials: "same-origin",
    })
      .then((response) => {
        if (!response.ok) return;
        try {
          window.localStorage.removeItem(GUEST_DRAFT_KEY);
        } catch {
          // Sans effet : le brouillon expirera de lui-même.
        }
        clearCookie();
        window.location.reload();
      })
      .catch(() => undefined);
  }, []);

  return null;
}

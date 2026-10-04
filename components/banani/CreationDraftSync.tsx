"use client";

import { useEffect, useRef } from "react";
import { useDemo } from "./DemoProvider";
import {
  CREATION_DRAFT_STEPS,
  creationDraftSaveSchema,
  isCreationDraftWorthKeeping,
  type CreationDraftSave,
  type CreationDraftStep,
} from "@/lib/validation/creation-draft";

const CREATE_PREFIX = "/dashboard/create/";
const SAVE_DELAY_MS = 1500;

function stepFromPath(pathname: string): CreationDraftStep | null {
  if (!pathname.startsWith(CREATE_PREFIX)) return null;
  const step = pathname.slice(CREATE_PREFIX.length).replace(/\/+$/, "");
  return CREATION_DRAFT_STEPS.find((candidate) => candidate === step) ?? null;
}

/**
 * Enregistre en base, pour le compte connecté, l'avancement du parcours de création afin de pouvoir le reprendre
 * depuis l'application, le site ou un autre appareil (écran « Reprendre ou recommencer »). Ne rend rien.
 *
 * - Jamais en démonstration (aucun brouillon serveur dans `/demo`).
 * - Uniquement sur les étapes suivantes du parcours, pas sur l'écran de choix d'entrée : un état local vide ne doit
 *   jamais écraser un brouillon que l'utilisateur n'a pas encore choisi de reprendre ou d'abandonner.
 * - Échec réseau ou refus du serveur : ignoré, le parcours continue (le repli local reste en place).
 */
export default function CreationDraftSync() {
  const { isDemo, pathname, choices, fields, details, packIndex } = useDemo();
  const lastSaved = useRef("");
  const pending = useRef<{ body: string } | null>(null);

  const step = isDemo ? null : stepFromPath(pathname);
  const payload: CreationDraftSave | null = step
    ? {
        step,
        data: {
          choices: {
            occasion: choices.occasion ?? "",
            genre: choices.genre ?? "",
            mood: choices.mood ?? "",
            language: choices.language ?? "",
            voice: choices.voice ?? "",
            recipientRelation: choices.recipientRelation ?? "",
          },
          fields: {
            story: fields.story ?? "",
            recipientName: fields.recipientName ?? "",
            recipientPronunciation: fields.recipientPronunciation ?? "",
            senderName: fields.senderName ?? "",
            senderPronunciation: fields.senderPronunciation ?? "",
            lyrics: fields.lyrics ?? "",
            detail: fields.detail ?? "",
          },
          details,
          packIndex,
        },
      }
    : null;
  const parsed = payload ? creationDraftSaveSchema.safeParse(payload) : null;
  const body = parsed?.success && isCreationDraftWorthKeeping(parsed.data.data) ? JSON.stringify(parsed.data) : "";

  useEffect(() => {
    pending.current = body && body !== lastSaved.current ? { body } : null;
    if (!pending.current) return;
    const timer = window.setTimeout(() => {
      const current = pending.current;
      if (!current) return;
      pending.current = null;
      void fetch("/api/creation-draft", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: current.body,
        credentials: "same-origin",
      })
        .then((response) => {
          if (response.ok) lastSaved.current = current.body;
        })
        .catch(() => undefined);
    }, SAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [body]);

  // L'utilisateur quitte l'application ou l'onglet : envoyer tout de suite ce qui n'est pas encore enregistré.
  useEffect(() => {
    const flush = (event: Event) => {
      const current = pending.current;
      if (!current || (event.type === "visibilitychange" && document.visibilityState === "visible")) return;
      pending.current = null;
      void fetch("/api/creation-draft", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: current.body,
        credentials: "same-origin",
        keepalive: true,
      })
        .then((response) => {
          if (response.ok) lastSaved.current = current.body;
        })
        .catch(() => undefined);
    };
    document.addEventListener("visibilitychange", flush);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", flush);
      window.removeEventListener("pagehide", flush);
    };
  }, []);

  return null;
}

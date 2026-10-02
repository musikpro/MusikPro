"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import Icon from "@/components/banani/Icon";

/** Relit l'état du planificateur (lecture seule : aucune donnée n'est enregistrée, donc pas de toast d'enregistrement). */
export default function SchedulerRefreshButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return (
    <button
      className="admin-secondary-action"
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => router.refresh())}
    >
      <Icon i="refresh-cw" size={15} />
      {isPending ? "Actualisation…" : "Actualiser"}
    </button>
  );
}

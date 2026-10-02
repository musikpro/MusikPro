"use client";

import { useActionState, useState, useTransition, type ReactNode } from "react";
import { addProposedFields } from "@/app/admin/occasion-fields/actions";
import { proposeOccasionFields } from "@/app/admin/occasion-fields/ai-actions";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import { useAdminActionToast, type AdminActionState } from "@/components/admin/useAdminActionToast";
import Icon from "@/components/banani/Icon";
import type { FieldProposal } from "@/lib/occasion-fields/ai-schema";

const TYPE_LABELS: Record<string, string> = {
  short_text: "Texte court",
  long_text: "Texte long",
  select: "Liste de choix",
  number: "Nombre",
  date: "Date",
};

export default function AdminOccasionFieldAiPanel({
  occasionId,
  extraAction,
}: {
  occasionId: string;
  /** Action secondaire (ex. « Nouveau champ ») affichée à côté du bouton IA, dans la même barre d’outils. */
  extraAction?: ReactNode;
}) {
  const showToast = useAdminToast();
  const [proposals, setProposals] = useState<FieldProposal[]>([]);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [loading, startLoad] = useTransition();
  const [state, formAction, adding] = useActionState<AdminActionState, FormData>(async (previous, formData) => {
    const result = await addProposedFields(previous, formData);
    if (result?.ok) {
      setProposals([]);
      setChecked(new Set());
    }
    return result;
  }, null);
  useAdminActionToast(state);

  const propose = () =>
    startLoad(async () => {
      const result = await proposeOccasionFields(occasionId);
      if (!result.ok) {
        showToast({ message: result.message, tone: "error" });
        return;
      }
      setProposals(result.proposals);
      setChecked(new Set(result.proposals.map((_, index) => index)));
    });

  const selected = proposals.filter((_, index) => checked.has(index));
  return (
    <section className="admin-panel admin-editor-card">
      <div className="admin-occasion-fields-toolbar">
        <button type="button" className="admin-secondary-action" onClick={propose} disabled={loading}>
          <Icon i="sparkles" size={16} /> {loading ? "L’IA réfléchit…" : "Proposer des champs avec l’IA"}
        </button>
        {extraAction}
      </div>
      {proposals.length ? (
        <form action={formAction}>
          <input type="hidden" name="occasionId" value={occasionId} />
          <input type="hidden" name="proposals" value={JSON.stringify(selected)} />
          <ul className="admin-ai-proposals">
            {proposals.map((proposal, index) => (
              <li key={`${proposal.label}-${index}`}>
                <label>
                  <input
                    type="checkbox"
                    checked={checked.has(index)}
                    onChange={() =>
                      setChecked((current) => {
                        const next = new Set(current);
                        if (next.has(index)) next.delete(index);
                        else next.add(index);
                        return next;
                      })
                    }
                  />{" "}
                  <span aria-hidden="true">{proposal.icon || "📝"}</span> <strong>{proposal.label}</strong> —{" "}
                  {TYPE_LABELS[proposal.type]}
                  {proposal.required ? " · obligatoire" : ""}
                  {proposal.options.length ? ` · ${proposal.options.map((option) => `${option.emoji} ${option.label}`).join(", ")}` : ""}
                </label>
              </li>
            ))}
          </ul>
          <button type="submit" className="admin-primary-action" disabled={adding || !selected.length}>
            <Icon i="plus" size={16} /> Ajouter la sélection ({selected.length})
          </button>
        </form>
      ) : null}
    </section>
  );
}

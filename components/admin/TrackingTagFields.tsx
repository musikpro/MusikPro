import { TRACKING_CODE_MAX } from "@/lib/tracking-tags/parse";
import { TRACKING_NAME_MAX, type TrackingPlacement } from "@/lib/validation/tracking-tags";

export type TrackingTagView = {
  id: string;
  name: string;
  code: string;
  placement: TrackingPlacement;
  enabled: boolean;
};

export const TRACKING_PLACEMENT_LABELS: Record<TrackingPlacement, string> = {
  landing: "Landing page seulement",
  dashboard: "Tableau de bord client seulement",
  both: "Landing page + tableau de bord client",
};

const fieldStyle = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid var(--admin-border)",
  borderRadius: 12,
} as const;

/** Champs du formulaire de balise, communs à l'ajout et à la modification (AdminTrackingTagSortableList, page). */
export default function TrackingTagFields({ idPrefix, tag }: { idPrefix: string; tag?: TrackingTagView }) {
  return (
    <>
      {tag ? <input type="hidden" name="id" value={tag.id} /> : null}
      <label className="admin-field-label" htmlFor={`${idPrefix}-name`}>
        Nom de la balise
      </label>
      <input
        id={`${idPrefix}-name`}
        name="name"
        required
        maxLength={TRACKING_NAME_MAX}
        defaultValue={tag?.name ?? ""}
        placeholder="Ex. : Facebook code"
        style={fieldStyle}
      />
      <label className="admin-field-label" htmlFor={`${idPrefix}-code`} style={{ marginTop: 12 }}>
        Code de la balise
      </label>
      <textarea
        id={`${idPrefix}-code`}
        name="code"
        required
        rows={5}
        maxLength={TRACKING_CODE_MAX}
        defaultValue={tag?.code ?? ""}
        placeholder={'<meta name="facebook-domain-verification" content="..." />'}
        spellCheck={false}
        style={{ ...fieldStyle, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 13 }}
      />
      <label className="admin-field-label" htmlFor={`${idPrefix}-placement`} style={{ marginTop: 12 }}>
        Où mesurer l’audience ?
      </label>
      <select
        id={`${idPrefix}-placement`}
        name="placement"
        defaultValue={tag?.placement ?? "landing"}
        style={fieldStyle}
      >
        {(Object.keys(TRACKING_PLACEMENT_LABELS) as TrackingPlacement[]).map((value) => (
          <option key={value} value={value}>
            {TRACKING_PLACEMENT_LABELS[value]}
          </option>
        ))}
      </select>
      <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
        <input type="checkbox" name="enabled" defaultChecked={tag ? tag.enabled : true} />
        Balise active
      </label>
    </>
  );
}

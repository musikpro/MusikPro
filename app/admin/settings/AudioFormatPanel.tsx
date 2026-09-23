import AdminSelect from "@/components/admin/AdminSelect";
import Icon from "@/components/banani/Icon";
import { setPreferredAudioFormat } from "./actions";

const FORMAT_LABELS: Record<string, string> = {
  native: "Automatique (MP3 natif)",
  wav: "WAV systématique",
};

export default function AudioFormatPanel({ preferredAudioFormat }: { preferredAudioFormat: "native" | "wav" }) {
  return (
    <section className="admin-panel admin-bypass-panel">
      <div className="admin-provider-heading">
        <span className="admin-catalog-icon"><Icon i="music-4" size={20} /></span>
        <div>
          <h2>Format audio reçu de Musicful</h2>
          <p>
            MusikPro est un site 100% musique : Musicful ne propose aucun réglage pour demander directement de
            l’audio plutôt qu’une vidéo à la génération — le fichier final peut arriver en MP3 (audio) ou, pour
            certaines chansons, en MP4 (vidéo). « Automatique » accepte le MP3 natif et ne convertit en WAV que si
            Musicful renvoie une vidéo. « WAV systématique » force une conversion en audio WAV qualité studio pour
            chaque chanson, même quand le natif est déjà correct (fichiers plus lourds).
          </p>
        </div>
        <span className="admin-status is-success">{FORMAT_LABELS[preferredAudioFormat] ?? preferredAudioFormat}</span>
      </div>
      <form action={setPreferredAudioFormat} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <AdminSelect
          name="preferredAudioFormat"
          defaultValue={preferredAudioFormat}
          ariaLabel="Format audio souhaité"
          options={[
            { value: "native", label: "Automatique (MP3 natif, conversion WAV si vidéo)" },
            { value: "wav", label: "WAV systématique (qualité studio, fichiers plus lourds)" },
          ]}
        />
        <button type="submit" className="admin-secondary-action">
          <Icon i="save" size={15} />
          Enregistrer
        </button>
      </form>
    </section>
  );
}

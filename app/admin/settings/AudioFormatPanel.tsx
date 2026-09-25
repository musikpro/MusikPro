import AdminSelect from "@/components/admin/AdminSelect";
import AdminButton from "@/components/admin/AdminButton";
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
        <span className="admin-catalog-icon">
          <Icon i="music-4" size={20} />
        </span>
        <div>
          <h2>Format audio reçu de Musicful</h2>
          <p>
            MusikPro n’expose que du MP3 à l’utilisateur final (MP4/vidéo désactivé) : Musicful ne propose aucun réglage
            pour demander directement de l’audio à la génération — le fichier natif peut arriver en MP3 ou, pour
            certaines chansons, en MP4 (vidéo) selon leur pipeline. Ce réglage ne change pas ce qui est livré à
            l’utilisateur (toujours du MP3, vérifié puis transcodé automatiquement si besoin) : il choisit seulement la
            source de départ. « Automatique » privilégie le MP3 natif quand Musicful le renvoie déjà. « WAV systématique
            » force d’abord une conversion en audio WAV qualité studio pour chaque chanson (source intermédiaire plus
            riche, fichiers de traitement plus lourds), qui est ensuite elle aussi transcodée en MP3 avant d’être
            servie.
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
        <div className="admin-btn-row">
          <AdminButton type="submit" variant="primary">
            <Icon i="save" size={15} />
            Enregistrer
          </AdminButton>
        </div>
      </form>
    </section>
  );
}

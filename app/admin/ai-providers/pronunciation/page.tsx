import Link from "next/link";
import { AdminBackLink, AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import Icon from "@/components/banani/Icon";
import { requireAdmin } from "@/lib/auth/session";
import { BUILTIN_NAMES } from "@/lib/phonetics-offline/dictionary";

export default async function AdminPronunciationProviderPage() {
  await requireAdmin();

  return (
    <AdminPage>
      <AdminBackLink href="/admin/ai-providers" label="Toutes les capacités IA" />
      <AdminPageHeader
        eyebrow="Moteur phonétique"
        title="Prononciation des noms"
        description="Propose la prononciation des prénoms et noms saisis par les utilisateurs."
      />
      <section className="admin-panel admin-module-empty">
        <span>
          <Icon i="speech" size={26} />
        </span>
        <h2>Moteur local</h2>
        <p>
          Cette capacité n’utilise plus aucun fournisseur IA : un dictionnaire de {BUILTIN_NAMES.length} graphies
          africaines et francophones et des règles déterministes calculent la prononciation instantanément, sans clé,
          sans coût et sans appel réseau. Les deux champs « Prononciation suggérée » sont automatiques et non
          modifiables par les clients. Pour un nom absent du dictionnaire, il s’agit d’une estimation.
        </p>
        <span className="admin-status is-success">Actif</span>
        <Link href="/admin/ai-providers/lyrics" className="admin-back-link" style={{ marginTop: 16 }}>
          <Icon i="settings" size={16} />
          Fournisseur de paroles
        </Link>
      </section>
    </AdminPage>
  );
}

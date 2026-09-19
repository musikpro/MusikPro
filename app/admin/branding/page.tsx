import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import Icon from "@/components/banani/Icon";
import { requireAdmin } from "@/lib/auth/session";

const tokens = [
  { label: "Orange principal", value: "#F26522", color: "#f26522" },
  { label: "Orange doux", value: "#FDE8D8", color: "#fde8d8" },
  { label: "Ivoire", value: "#FAFAF7", color: "#fafaf7" },
  { label: "Encre", value: "#1A1A1A", color: "#1a1a1a" },
];

export default async function AdminBrandingPage() {
  await requireAdmin();
  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Identité"
        title="Branding"
        description="Référence visuelle appliquée aux espaces client et propriétaire."
      />
      <section className="admin-insight-grid">
        <article className="admin-panel">
          <div className="admin-panel-heading">
            <div>
              <span className="admin-panel-icon">
                <Icon i="palette" size={18} />
              </span>
              <div>
                <h2>Palette officielle</h2>
                <p>Couleurs issues du design system MusikPro</p>
              </div>
            </div>
          </div>
          <div className="admin-brand-swatches">
            {tokens.map((token) => (
              <div key={token.value}>
                <span style={{ background: token.color }} />
                <div>
                  <strong>{token.label}</strong>
                  <small>{token.value}</small>
                </div>
              </div>
            ))}
          </div>
        </article>
        <article className="admin-panel">
          <div className="admin-panel-heading">
            <div>
              <span className="admin-panel-icon">
                <Icon i="type" size={18} />
              </span>
              <div>
                <h2>Typographie</h2>
                <p>Hiérarchie commune à toute l’application</p>
              </div>
            </div>
          </div>
          <div className="admin-type-sample">
            <strong>DM Sans</strong>
            <span>Aa</span>
            <p>Titres affirmés, textes lisibles et chiffres compacts.</p>
          </div>
        </article>
      </section>
      <section className="admin-panel admin-brand-guidelines">
        <div>
          <Icon i="layout-grid" size={19} />
          <strong>Interface par cartes</strong>
          <p>Surfaces claires, rayons généreux et ombres légères.</p>
        </div>
        <div>
          <Icon i="mouse-pointer-click" size={19} />
          <strong>Interactions visibles</strong>
          <p>Focus orange, cibles tactiles de 44 px minimum.</p>
        </div>
        <div>
          <Icon i="accessibility" size={19} />
          <strong>Accessible et responsive</strong>
          <p>Contrastes stables, mobile-first et réduction des animations.</p>
        </div>
      </section>
    </AdminPage>
  );
}

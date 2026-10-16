import { redirect } from "next/navigation";
import Icon from "@/components/banani/Icon";
import AdminActionForm from "@/components/admin/AdminActionForm";
import AdminConfirmSubmit from "@/components/admin/AdminConfirmSubmit";
import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { hasAppRole } from "@/lib/auth/permissions";
import { requireAdmin } from "@/lib/auth/session";
import { getMaintenanceStatus } from "@/lib/maintenance/settings";
import { MAINTENANCE_MESSAGE_MAX } from "@/lib/validation/maintenance";
import { setMaintenance } from "./actions";

export const dynamic = "force-dynamic";

/**
 * Mode maintenance — bascule le site client en « Maintenance en cours » (503) sans toucher à l'administration, à la
 * connexion, aux webhooks de paiement ni aux tâches planifiées (voir lib/maintenance/paths.ts). Réservé au Super Admin.
 */
export default async function AdminMaintenancePage() {
  const session = await requireAdmin();
  if (!hasAppRole((session.user as { role?: string }).role, "admin")) redirect("/admin");
  const status = await getMaintenanceStatus();
  const { enabled } = status;

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Système"
        title="Mode maintenance"
        description="Affiche une page « Maintenance en cours » aux visiteurs et aux clients pendant une intervention. Ce tableau de bord reste accessible."
      />
      <section className={`admin-panel admin-bypass-panel ${enabled ? "is-active" : ""}`}>
        <div className="admin-provider-heading">
          <span className="admin-catalog-icon">
            <Icon i="construction" size={20} />
          </span>
          <div>
            <h2>{enabled ? "Le site est en maintenance" : "Le site est en ligne"}</h2>
            <p>
              Quand le mode est actif, les pages et les API clientes répondent « 503 — maintenance » (les moteurs de
              recherche ne désindexent rien). Restent accessibles : l’administration, la connexion et la double
              authentification, les webhooks de paiement, les tâches planifiées et les contrôles de santé. Les clients
              ne peuvent ni générer de chanson ni payer pendant ce temps. Un changement prend effet en quelques
              secondes.
            </p>
          </div>
          <span className={`admin-status ${enabled ? "is-danger" : "is-success"}`}>
            {enabled ? "Actif" : "Inactif"}
          </span>
        </div>
        {enabled ? (
          <p className="admin-bypass-warning">
            <Icon i="triangle-alert" size={14} />
            Actif{status.enabledAt ? ` depuis le ${status.enabledAt.toLocaleString("fr-FR")}` : ""}. Pense à le
            désactiver à la fin de l’intervention.
          </p>
        ) : null}

        <AdminActionForm action={setMaintenance}>
          <input type="hidden" name="enable" value="true" />
          <label className="admin-field-label" htmlFor="maintenance-message">
            Message affiché aux visiteurs (facultatif)
          </label>
          <textarea
            id="maintenance-message"
            name="message"
            rows={3}
            maxLength={MAINTENANCE_MESSAGE_MAX}
            defaultValue={status.message ?? ""}
            placeholder="Ex. : Retour prévu vers 14 h, heure d’Abidjan."
            style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--admin-border)", borderRadius: 12 }}
          />
          <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--admin-muted)" }}>
            Texte libre, affiché tel quel (non traduit), {MAINTENANCE_MESSAGE_MAX} caractères maximum.
          </p>
          <div className="admin-btn-row">
            {enabled ? (
              <button type="submit" className="admin-btn admin-btn-secondary">
                <Icon i="save" size={15} />
                Mettre à jour le message
              </button>
            ) : (
              <AdminConfirmSubmit
                variant="danger"
                confirmMessage="Activer la maintenance ? Les visiteurs et les clients verront la page « Maintenance en cours » : ils ne pourront ni générer de chanson ni payer. Ce tableau de bord reste accessible."
              >
                <Icon i="construction" size={15} />
                Activer la maintenance
              </AdminConfirmSubmit>
            )}
          </div>
        </AdminActionForm>

        {enabled ? (
          <AdminActionForm action={setMaintenance}>
            <input type="hidden" name="enable" value="false" />
            <div className="admin-btn-row">
              <AdminConfirmSubmit
                variant="primary"
                confirmMessage="Désactiver la maintenance et rouvrir le site aux clients ?"
              >
                <Icon i="power" size={15} />
                Désactiver la maintenance
              </AdminConfirmSubmit>
            </div>
          </AdminActionForm>
        ) : null}
      </section>
    </AdminPage>
  );
}

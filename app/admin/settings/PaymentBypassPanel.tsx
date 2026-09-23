import Icon from "@/components/banani/Icon";
import AdminConfirmSubmit from "@/components/admin/AdminConfirmSubmit";
import { setPaymentBypass } from "./actions";
import type { PaymentBypassStatus } from "@/lib/settings/payment-bypass";

export default function PaymentBypassPanel({ status }: { status: PaymentBypassStatus }) {
  const { enabled, enabledAt } = status;
  return (
    <section className={`admin-panel admin-bypass-panel ${enabled ? "is-active" : ""}`}>
      <div className="admin-provider-heading">
        <span className="admin-catalog-icon"><Icon i="flask-conical" size={20} /></span>
        <div>
          <h2>Mode test — génération sans paiement</h2>
          <p>
            Réservé aux comptes propriétaires (rôle admin) : autorise ces comptes à générer une chanson sans crédits
            et sans passerelle active, pour travailler sur le reste du produit avant de régler les paiements. Les
            comptes clients ne sont jamais concernés, même actif, et n’affichent aucune bannière. Aucun crédit réel
            n’est débité tant que ce mode est actif.
          </p>
        </div>
        <span className={`admin-status ${enabled ? "is-success" : "is-pending"}`}>
          {enabled ? "Actif" : "Inactif"}
        </span>
      </div>
      {enabled ? (
        <p className="admin-bypass-warning">
          <Icon i="triangle-alert" size={14} />
          Actif{enabledAt ? ` depuis le ${enabledAt.toLocaleDateString("fr-FR")}` : ""}. Désactive-le avant la mise
          en ligne réelle : les comptes propriétaires génèrent gratuitement tant qu’il reste actif.
        </p>
      ) : null}
      <form action={setPaymentBypass}>
        <input type="hidden" name="enabled" value={enabled ? "off" : "on"} />
        <div className="admin-btn-row">
          <AdminConfirmSubmit
            variant="primary"
            confirmMessage={
              enabled
                ? "Désactiver le mode test ? Les comptes propriétaires devront de nouveau avoir des crédits pour générer une chanson."
                : "Activer le mode test ? Tant que c’est actif, les comptes propriétaires (rôle admin) pourront générer une chanson gratuitement, sans crédits ni passerelle configurée. Les comptes clients ne sont jamais concernés. Pense à le désactiver avant la mise en ligne réelle."
            }
          >
            <Icon i={enabled ? "power-off" : "flask-conical"} size={15} />
            {enabled ? "Désactiver le mode test" : "Activer le mode test"}
          </AdminConfirmSubmit>
        </div>
      </form>
    </section>
  );
}

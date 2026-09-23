import { getServiceDb } from "@/db";
import { paymentProviderConfigs } from "@/db/schema";
import AdminCatalogPage from "@/components/admin/AdminCatalogPage";
import { requireAdmin } from "@/lib/auth/session";
import { getChariowConfiguration } from "@/lib/payments/chariow-config";

export default async function PaymentProvidersPage() {
  await requireAdmin();
  const configs = await getServiceDb().select().from(paymentProviderConfigs);
  const current = configs.find((entry) => entry.provider === "chariow");
  let apiLast4 = "";
  try {
    const stored = await getChariowConfiguration();
    apiLast4 = stored.config.apiKey?.last4 || "";
  } catch {}
  const chariowActive = Boolean(current?.enabled && apiLast4);

  return (
    <AdminCatalogPage
      eyebrow="Paiements"
      title="Passerelles"
      description="Chaque fournisseur de paiement possède sa propre boîte de configuration."
      searchLabel="Rechercher une passerelle"
      sourceNote="Ouvre une boîte pour configurer ce fournisseur, puis reviens ici pour en choisir un autre."
      items={[
        {
          id: "chariow",
          title: "Chariow",
          subtitle: "Mobile Money et carte bancaire via une page de paiement sécurisée",
          meta: chariowActive ? "Clé API et webhook enregistrés" : "Clé API et webhook à saisir",
          status: chariowActive ? "active" : "inactive",
          icon: "credit-card",
          href: "/admin/payment-providers/chariow",
        },
        {
          id: "future-gateway",
          title: "Autre passerelle",
          subtitle: "Architecture prête pour un futur fournisseur (Mobile Money, carte bancaire…)",
          meta: "Aucun fournisseur supplémentaire configuré",
          status: "coming",
          icon: "plus",
        },
      ]}
    />
  );
}

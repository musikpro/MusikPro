import { requireUser } from "@/lib/auth/session";
import { DashboardNav } from "@/components/dashboard-nav";
import { TwoFactorSetup } from "@/components/two-factor-setup";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const s = await requireUser();
  const q = await searchParams;
  const enabled = Boolean((s.user as any).twoFactorEnabled);
  return (
    <main className="shell">
      <DashboardNav />
      {q.required && (
        <p className="notice">
          La politique de sécurité actuelle exige le 2FA pour accéder à
          l'administration.
        </p>
      )}
      <h1>Sécurité du compte</h1>
      <div className="grid">
        <div className="card">
          <h3>E-mail vérifié</h3>
          <strong>{s.user.emailVerified ? "Oui" : "Non"}</strong>
        </div>
        <div className="card">
          <h3>2FA</h3>
          <strong>{enabled ? "Activé" : "Désactivé"}</strong>
        </div>
      </div>
      <TwoFactorSetup enabled={enabled} />
      <div className="card">
        <h2>Bonnes pratiques</h2>
        <ul>
          <li>Utilisez un mot de passe unique.</li>
          <li>Activez le 2FA pour les comptes sensibles.</li>
          <li>Ne partagez jamais vos codes de secours.</li>
          <li>
            Révoquez les sessions inconnues depuis les endpoints Better Auth si
            nécessaire.
          </li>
        </ul>
      </div>
    </main>
  );
}

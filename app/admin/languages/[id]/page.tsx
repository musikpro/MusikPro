import { eq, or } from "drizzle-orm";
import { notFound } from "next/navigation";
import AdminLanguageForm from "@/components/admin/AdminLanguageForm";
import { AdminBackLink, AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import Icon from "@/components/banani/Icon";
import { getServiceDb } from "@/db";
import { languages, localizationSettings } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { setDefaultLanguage, updateLanguage } from "../actions";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const serviceDb = getServiceDb();
  const [[language], [settings]] = await Promise.all([
    serviceDb
      .select()
      .from(languages)
      .where(or(eq(languages.id, id), eq(languages.code, id.toLowerCase())))
      .limit(1),
    serviceDb.select().from(localizationSettings).where(eq(localizationSettings.id, "global")).limit(1),
  ]);
  if (!language) notFound();
  const isDefault = (settings?.defaultLanguageCode ?? "fr") === language.code;
  return (
    <AdminPage>
      <AdminBackLink href="/admin/languages" />
      <AdminPageHeader
        eyebrow="Langues"
        title={`Modifier ${language.name}`}
        description="Les changements sont immédiatement partagés avec le parcours client."
      />
      <section className="admin-panel admin-language-section">
        <div className="admin-section-heading">
          <div>
            <h2>Langue par défaut</h2>
            <p>
              Utilisée comme repli lorsque la détection automatique du pays est désactivée ou ne trouve pas de
              correspondance.
            </p>
          </div>
          <span className={`admin-status ${isDefault ? "is-success" : "is-pending"}`}>
            {isDefault ? "Langue par défaut" : "Non définie par défaut"}
          </span>
        </div>
        {!isDefault && (
          <form action={setDefaultLanguage}>
            <input type="hidden" name="code" value={language.code} />
            <button className="admin-secondary-action" type="submit">
              <Icon i="star" size={16} /> Définir comme langue par défaut
            </button>
          </form>
        )}
      </section>
      <AdminLanguageForm action={updateLanguage} values={language} />
    </AdminPage>
  );
}

import { asc } from "drizzle-orm";
import Link from "next/link";
import AdminHeroAnimatedTextSortableGrid from "@/components/admin/AdminHeroAnimatedTextSortableGrid";
import HeroAnimationSettingsPanel from "@/components/admin/HeroAnimationSettingsPanel";
import HeroHeadlineForm from "@/components/admin/HeroHeadlineForm";
import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { AdminTabs, AdminTabPanel } from "@/components/admin/AdminTabs";
import Icon from "@/components/banani/Icon";
import { getServiceDb } from "@/db";
import { heroAnimatedTexts } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { getHeroSettings } from "@/lib/hero-animation/settings";

const TAB_IDS = ["headline", "animation", "texts"] as const;

export default async function AdminAnimatedTextsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireAdmin();
  const { tab } = await searchParams;
  const defaultTab = (TAB_IDS as readonly string[]).includes(tab ?? "") ? tab : undefined;
  const [rows, heroSettings] = await Promise.all([
    getServiceDb().select().from(heroAnimatedTexts).orderBy(asc(heroAnimatedTexts.sortOrder), asc(heroAnimatedTexts.label)),
    getHeroSettings(),
  ]);
  const activeCount = rows.filter((row) => row.active).length;
  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Configuration landing"
        title="Hero de la landing"
        description="Le grand titre et les mots qui défilent en dessous, sur la page d’accueil publique."
      />
      <AdminTabs
        ariaLabel="Réglages du Hero"
        defaultTab={defaultTab}
        tabs={[
          { id: "headline", label: "Titre principal" },
          { id: "animation", label: "Animation" },
          { id: "texts", label: "Textes défilants" },
        ]}
      >
        <AdminTabPanel id="headline">
          <HeroHeadlineForm headline={heroSettings.headline} />
        </AdminTabPanel>
        <AdminTabPanel id="animation">
          <HeroAnimationSettingsPanel animationType={heroSettings.animationType} textSize={heroSettings.textSize} />
        </AdminTabPanel>
        <AdminTabPanel id="texts">
          <AdminPageHeader
            eyebrow="Textes défilants"
            title="Textes animés"
            description={`${activeCount} texte${activeCount > 1 ? "s" : ""} actif${activeCount > 1 ? "s" : ""} sur ${rows.length}. Ces mots défilent en boucle sous le titre du Hero.`}
            action={{ href: "/admin/animated-texts/new", label: "Nouveau texte" }}
          />
          <div className="admin-source-notice is-connected">
            <Icon i="database-zap" size={18} />
            <div>
              <strong>Catalogue connecté à Neon</strong>
              <p>Le libellé, l’emoji, l’état et l’ordre sont appliqués au Hero de la landing publique.</p>
            </div>
          </div>
          {rows.length ? (
            <AdminHeroAnimatedTextSortableGrid texts={rows} />
          ) : (
            <div className="admin-empty-state admin-catalog-empty">
              <Icon i="sparkles" size={24} />
              <strong>Aucun texte animé enregistré</strong>
              <p>Ajoute un mot ou une courte phrase à faire défiler sous le titre du Hero.</p>
              <Link className="admin-primary-action" href="/admin/animated-texts/new">
                <Icon i="plus" size={16} /> Ajouter un texte
              </Link>
            </div>
          )}
        </AdminTabPanel>
      </AdminTabs>
    </AdminPage>
  );
}

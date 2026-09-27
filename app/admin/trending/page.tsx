import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import TrendingPanel from "@/components/admin/TrendingPanel";
import { requireAdmin } from "@/lib/auth/session";
import { getTrendingSettings } from "@/lib/trending/settings";
import { listPublishedSongsForAdmin } from "@/lib/trending/admin";

export default async function AdminTrendingPage() {
  await requireAdmin();
  const [settings, songs] = await Promise.all([getTrendingSettings(), listPublishedSongsForAdmin()]);
  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Engagement"
        title="Tendances"
        description="Choisis les chansons mises en avant dans le widget « Tendances » du tableau de bord client, en automatique ou à la main."
      />
      <TrendingPanel settings={settings} songs={songs} />
    </AdminPage>
  );
}

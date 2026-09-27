import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import AmbientMusicPanel from "@/components/admin/AmbientMusicPanel";
import { requireAdmin } from "@/lib/auth/session";
import { listSongGroupsForUser, extractGenreLabel } from "@/lib/ai/songs";
import { getAmbientTrackStatus } from "@/lib/settings/ambient-track";

export default async function AmbientMusicAdminPage() {
  const session = await requireAdmin();
  const [status, groups] = await Promise.all([
    getAmbientTrackStatus(),
    listSongGroupsForUser(session.user.id),
  ]);
  const songOptions = groups
    .filter((group) => group.status === "completed" && group.versions[0]?.audioUrl)
    .map((group) => ({
      songGroupId: group.songGroupId,
      title: group.title,
      styleLabel: extractGenreLabel(group.style),
    }));
  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Configuration"
        title="Musique d'ambiance"
        description="Choisis une de tes chansons pour qu'elle joue en fond sonore sur l'accueil du tableau de bord."
      />
      <AmbientMusicPanel status={status} songOptions={songOptions} currentSongGroupId={status.songGroupId} />
    </AdminPage>
  );
}

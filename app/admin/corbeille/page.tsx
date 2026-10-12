import Icon from "@/components/banani/Icon";
import AdminActionForm from "@/components/admin/AdminActionForm";
import AdminButton from "@/components/admin/AdminButton";
import AdminTrashPurgeButton from "@/components/admin/AdminTrashPurgeButton";
import { AdminMetric, AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { AdminTabPanel, AdminTabs } from "@/components/admin/AdminTabs";
import { requireAdmin } from "@/lib/auth/session";
import { siteBaseUrl } from "@/lib/guest-links/base-url";
import { listTrashedGuestLinks } from "@/lib/guest-links/server";
import { stripVersionSuffix } from "@/lib/ai/song-title";
import { daysRemaining, purgeDate } from "@/lib/trash/retention";
import { getTrashRetention } from "@/lib/trash/settings";
import { listTrashedSongs } from "@/lib/trash/songs";
import { listTrashedUsers } from "@/lib/trash/users";
import { guestLinkUrl } from "@/lib/validation/guest-links";
import {
  purgeGuestLinkFromTrash,
  purgeSong,
  purgeUser,
  restoreGuestLinkFromTrash,
  restoreSong,
  restoreUser,
} from "./actions";

function formatDay(date: Date) {
  return date.toLocaleDateString("fr-FR");
}

function Remaining({ deletedAt, retentionDays }: { deletedAt: Date; retentionDays: number }) {
  const days = daysRemaining(deletedAt, retentionDays);
  return (
    <>
      <span>{days > 1 ? `Dans ${days} jours` : days === 1 ? "Demain" : "Aujourd’hui"}</span>
      <br />
      <small>le {formatDay(purgeDate(deletedAt, retentionDays))}</small>
    </>
  );
}

export default async function AdminTrashPage() {
  await requireAdmin();
  const [songs, users, guestLinks, retention] = await Promise.all([
    listTrashedSongs(),
    listTrashedUsers(),
    listTrashedGuestLinks(),
    getTrashRetention(),
  ]);
  const baseUrl = siteBaseUrl();

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Sécurité"
        title="Corbeille"
        description={`Les chansons, les comptes et les liens invités supprimés restent ici ${retention.songsRetentionDays} jours (chansons), ${retention.usersRetentionDays} jours (comptes) et ${retention.guestLinksRetentionDays} jours (liens invités), puis sont supprimés définitivement. Le délai se règle dans Paramètres > Général.`}
      />
      <section className="admin-metric-row admin-metrics-compact">
        <AdminMetric icon="music-2" value={songs.length.toLocaleString("fr-FR")} label="Chansons en corbeille" />
        <AdminMetric icon="users" value={users.length.toLocaleString("fr-FR")} label="Comptes en corbeille" />
        <AdminMetric icon="link" value={guestLinks.length.toLocaleString("fr-FR")} label="Liens invités en corbeille" />
      </section>
      <AdminTabs
        ariaLabel="Contenu de la corbeille"
        tabs={[
          { id: "songs", label: `Chansons (${songs.length})` },
          { id: "users", label: `Utilisateurs (${users.length})` },
          { id: "guest-links", label: `Liens invités (${guestLinks.length})` },
        ]}
      >
        <AdminTabPanel id="songs">
          <section className="admin-panel admin-table-panel">
            {songs.length ? (
              <div className="admin-data-table-wrap">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>Chanson</th>
                      <th>Propriétaire</th>
                      <th>Supprimée le</th>
                      <th>Suppression automatique</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {songs.map((song) => {
                      const label = stripVersionSuffix(song.title ?? "") || "Chanson sans titre";
                      return (
                        <tr key={song.songKey}>
                          <td className="admin-table-primary" data-label="Chanson">
                            <strong>{label}</strong>
                            <small>{song.versions > 1 ? `${song.versions} versions` : "1 version"}</small>
                          </td>
                          <td data-label="Propriétaire">{song.ownerEmail ?? "Compte supprimé"}</td>
                          <td data-label="Supprimée le">{formatDay(song.deletedAt)}</td>
                          <td data-label="Suppression automatique">
                            <Remaining deletedAt={song.deletedAt} retentionDays={retention.songsRetentionDays} />
                          </td>
                          <td data-label="Actions">
                            <div className="admin-table-actions">
                              <AdminActionForm action={restoreSong}>
                                <input type="hidden" name="songKey" value={song.songKey} />
                                <AdminButton type="submit" variant="secondary">
                                  <Icon i="undo-2" size={15} />
                                  Restaurer
                                </AdminButton>
                              </AdminActionForm>
                              <AdminActionForm action={purgeSong}>
                                <input type="hidden" name="songKey" value={song.songKey} />
                                <AdminTrashPurgeButton label={label} />
                              </AdminActionForm>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="admin-empty-state">
                <Icon i="inbox" size={22} />
                <strong>Aucune chanson en corbeille</strong>
                <p>Une chanson supprimée depuis Générations apparaît ici.</p>
              </div>
            )}
          </section>
        </AdminTabPanel>
        <AdminTabPanel id="users">
          <section className="admin-panel admin-table-panel">
            {users.length ? (
              <div className="admin-data-table-wrap">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>Utilisateur</th>
                      <th>Supprimé le</th>
                      <th>Suppression automatique</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((entry) => (
                      <tr key={entry.userId}>
                        <td className="admin-table-primary" data-label="Utilisateur">
                          <strong>{entry.name}</strong>
                          <small>{entry.email}</small>
                        </td>
                        <td data-label="Supprimé le">{formatDay(entry.deletedAt)}</td>
                        <td data-label="Suppression automatique">
                          <Remaining deletedAt={entry.deletedAt} retentionDays={retention.usersRetentionDays} />
                        </td>
                        <td data-label="Actions">
                          <div className="admin-table-actions">
                            <AdminActionForm action={restoreUser}>
                              <input type="hidden" name="userId" value={entry.userId} />
                              <AdminButton type="submit" variant="secondary">
                                <Icon i="undo-2" size={15} />
                                Restaurer
                              </AdminButton>
                            </AdminActionForm>
                            <AdminActionForm action={purgeUser}>
                              <input type="hidden" name="userId" value={entry.userId} />
                              <AdminTrashPurgeButton label={entry.email} />
                            </AdminActionForm>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="admin-empty-state">
                <Icon i="inbox" size={22} />
                <strong>Aucun compte en corbeille</strong>
                <p>Un compte supprimé depuis Utilisateurs apparaît ici, suspendu et restaurable.</p>
              </div>
            )}
          </section>
        </AdminTabPanel>
        <AdminTabPanel id="guest-links">
          <section className="admin-panel admin-table-panel">
            {guestLinks.length ? (
              <div className="admin-data-table-wrap">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>Lien</th>
                      <th>Supprimé le</th>
                      <th>Suppression automatique</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guestLinks.map((entry) => {
                      const deletedAt = entry.deletedAt ?? entry.updatedAt;
                      return (
                        <tr key={entry.id}>
                          <td className="admin-table-primary" data-label="Lien">
                            <strong>{entry.label}</strong>
                            <small style={{ wordBreak: "break-all" }}>{guestLinkUrl(baseUrl, entry.slug)}</small>
                          </td>
                          <td data-label="Supprimé le">{formatDay(deletedAt)}</td>
                          <td data-label="Suppression automatique">
                            <Remaining deletedAt={deletedAt} retentionDays={retention.guestLinksRetentionDays} />
                          </td>
                          <td data-label="Actions">
                            <div className="admin-table-actions">
                              <AdminActionForm action={restoreGuestLinkFromTrash}>
                                <input type="hidden" name="id" value={entry.id} />
                                <AdminButton type="submit" variant="secondary">
                                  <Icon i="undo-2" size={15} />
                                  Restaurer
                                </AdminButton>
                              </AdminActionForm>
                              <AdminActionForm action={purgeGuestLinkFromTrash}>
                                <input type="hidden" name="id" value={entry.id} />
                                <AdminTrashPurgeButton label={entry.label} />
                              </AdminActionForm>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="admin-empty-state">
                <Icon i="inbox" size={22} />
                <strong>Aucun lien invité en corbeille</strong>
                <p>Un lien supprimé depuis Liens invités apparaît ici, désactivé et restaurable.</p>
              </div>
            )}
          </section>
        </AdminTabPanel>
      </AdminTabs>
    </AdminPage>
  );
}

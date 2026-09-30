import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import AdminMediaAssetGrid from "@/components/admin/AdminMediaAssetGrid";
import AdminMediaUploadForm from "@/components/admin/AdminMediaUploadForm";
import Icon from "@/components/banani/Icon";
import { requireAdmin } from "@/lib/auth/session";
import { isCloudinaryConfigured } from "@/lib/storage/cloudinary";
import { listMediaAssets } from "@/lib/media/admin";
import { MAX_MEDIA_UPLOAD_FILES } from "@/lib/media/constants";

export default async function AdminMediaPage() {
  await requireAdmin();
  const [assets, configured] = await Promise.all([listMediaAssets(), Promise.resolve(isCloudinaryConfigured())]);

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Contenu"
        title="Médias"
        description={`Importe les images (pochettes de chansons et autres visuels) réutilisées ailleurs dans l'administration, jusqu'à ${MAX_MEDIA_UPLOAD_FILES} à la fois. Chaque image est automatiquement convertie en AVIF et compressée sous 2 Mo. Glisse-dépose tes fichiers ou clique pour les choisir.`}
      />
      {!configured ? (
        <div className="admin-source-notice">
          <Icon i="alert-triangle" size={18} />
          <div>
            <strong>Cloudinary n’est pas configuré</strong>
            <p>
              Renseigne CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY et CLOUDINARY_API_SECRET pour activer l’envoi
              d’images.
            </p>
          </div>
        </div>
      ) : null}
      <section className="admin-panel">
        <AdminMediaUploadForm disabled={!configured} />
      </section>
      {assets.length ? (
        <AdminMediaAssetGrid assets={assets} />
      ) : (
        <div className="admin-empty-state admin-catalog-empty">
          <Icon i="images" size={24} />
          <strong>Aucune image dans la médiathèque</strong>
          <p>Importe une image ci-dessus pour commencer.</p>
        </div>
      )}
    </AdminPage>
  );
}

import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import AdminOccasionFieldAiPanel from "@/components/admin/AdminOccasionFieldAiPanel";
import AdminOccasionBlocksForm from "@/components/admin/AdminOccasionBlocksForm";
import AdminOccasionFieldSortableGrid from "@/components/admin/AdminOccasionFieldSortableGrid";
import { AdminBackLink, AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { AdminTabPanel, AdminTabs } from "@/components/admin/AdminTabs";
import Icon from "@/components/banani/Icon";
import { getServiceDb } from "@/db";
import { occasionFields, occasions } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";

export default async function AdminOccasionDetailsPage({ params }: { params: Promise<{ occasionId: string }> }) {
  await requireAdmin();
  const { occasionId } = await params;
  const database = getServiceDb();
  const [occasion] = await database.select().from(occasions).where(eq(occasions.id, occasionId)).limit(1);
  if (!occasion) notFound();
  const [fields, allOccasions] = await Promise.all([
    database
      .select()
      .from(occasionFields)
      .where(eq(occasionFields.occasionId, occasionId))
      .orderBy(asc(occasionFields.sortOrder), asc(occasionFields.createdAt)),
    database.select({ id: occasions.id, name: occasions.name }).from(occasions).orderBy(asc(occasions.sortOrder), asc(occasions.name)),
  ]);
  return (
    <AdminPage>
      <AdminBackLink href="/admin/occasion-fields" />
      <AdminPageHeader
        eyebrow="Détails par occasion"
        title={`${occasion.emoji} ${occasion.name}`}
        description="Blocs intégrés et champs affichés à l’étape « Personnalise ta chanson »."
      />
      <AdminTabs
        ariaLabel="Détails de l’occasion"
        tabs={[
          { id: "blocks", label: "Blocs intégrés" },
          { id: "fields", label: "Champs" },
        ]}
      >
        <AdminTabPanel id="blocks">
          <AdminOccasionBlocksForm
            occasionId={occasion.id}
            showRecipient={occasion.showRecipient}
            showSender={occasion.showSender}
            titleFieldId={occasion.titleFieldId}
            fields={fields
              .filter((field) => field.active || field.id === occasion.titleFieldId)
              .map((field) => ({ id: field.id, label: field.active ? field.label : `${field.label} (inactif)` }))}
          />
        </AdminTabPanel>
        <AdminTabPanel id="fields">
          <AdminOccasionFieldAiPanel
            occasionId={occasion.id}
            extraAction={
              <Link className="admin-secondary-action" href={`/admin/occasion-fields/${occasion.id}/fields/new`}>
                <Icon i="plus" size={15} /> Nouveau champ
              </Link>
            }
          />
          {fields.length ? (
            <AdminOccasionFieldSortableGrid
              occasionId={occasion.id}
              fields={fields.map((field) => ({
                id: field.id,
                label: field.label,
                icon: field.icon,
                type: field.type,
                required: field.required,
                active: field.active,
              }))}
              otherOccasions={allOccasions.filter((other) => other.id !== occasion.id)}
            />
          ) : (
            <div className="admin-empty-state admin-catalog-empty">
              <strong>Aucun champ pour cette occasion</strong>
              <p>Ajoute-en un avec « Nouveau champ ».</p>
            </div>
          )}
        </AdminTabPanel>
      </AdminTabs>
    </AdminPage>
  );
}

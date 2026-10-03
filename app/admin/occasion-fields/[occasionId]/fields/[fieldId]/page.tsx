import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import AdminOccasionFieldForm from "@/components/admin/AdminOccasionFieldForm";
import { AdminBackLink, AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { getServiceDb } from "@/db";
import { occasionFields } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import type { OccasionFieldConfig, OccasionFieldOption, OccasionFieldType } from "@/lib/occasion-fields/types";
import { updateOccasionField } from "../../../actions";

export default async function AdminEditOccasionFieldPage({
  params,
}: {
  params: Promise<{ occasionId: string; fieldId: string }>;
}) {
  await requireAdmin();
  const { occasionId, fieldId } = await params;
  const [row] = await getServiceDb()
    .select()
    .from(occasionFields)
    .where(and(eq(occasionFields.id, fieldId), eq(occasionFields.occasionId, occasionId)))
    .limit(1);
  if (!row) notFound();
  return (
    <AdminPage>
      <AdminBackLink href={`/admin/occasion-fields/${occasionId}?tab=fields`} />
      <AdminPageHeader
        eyebrow="Détails par occasion"
        title={`Modifier ${row.label}`}
        description="Les changements apparaîtront dans les parcours client réel et démo."
      />
      <AdminOccasionFieldForm
        action={updateOccasionField}
        occasionId={occasionId}
        field={{
          id: row.id,
          occasionId: row.occasionId,
          key: row.key,
          label: row.label,
          helpText: row.helpText,
          icon: row.icon,
          placeholder: row.placeholder,
          type: row.type as OccasionFieldType,
          options: (row.options ?? []) as OccasionFieldOption[],
          config: (row.config ?? {}) as OccasionFieldConfig,
          required: row.required,
          aiHint: row.aiHint,
          sortOrder: row.sortOrder,
          active: row.active,
        }}
      />
    </AdminPage>
  );
}

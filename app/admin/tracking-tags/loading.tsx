import { AdminTableSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return <AdminTableSkeleton columns={2} rows={3} withForm />;
}

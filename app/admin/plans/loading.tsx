import { AdminTableSkeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return <AdminTableSkeleton columns={5} rows={7} withForm={true} />;
}

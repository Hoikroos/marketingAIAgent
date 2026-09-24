import { requirePerm } from "@/lib/guard";
import PageShell from "@/components/page-shell";
import CreateLeadForm from "@/components/CreateLeadForm";

export default async function NewLeadPage() {
  await requirePerm("leads");
  return (
    <PageShell title="Thêm lead" subtitle="Tạo lead mới">
      <div className="card p-6 max-w-xl">
        <CreateLeadForm />
      </div>
    </PageShell>
  );
}

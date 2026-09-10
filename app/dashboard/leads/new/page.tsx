import { requirePerm } from "@/lib/guard";
import PageShell from "@/components/page-shell";
import CreateLeadForm from "@/components/CreateLeadForm";
import { getStaffUsers } from "@/components/db";

export default async function NewLeadPage() {
  await requirePerm("leads");
  const users = await getStaffUsers();
  return (
    <PageShell title="Thêm lead" subtitle="Tạo lead mới">
      <div className="card p-6 max-w-xl">
        <CreateLeadForm users={users.map((u) => ({ id: u.id, name: u.name }))} />
      </div>
    </PageShell>
  );
}

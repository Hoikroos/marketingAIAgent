import { requireAdmin } from "@/lib/guard";
import PageShell from "@/components/page-shell";
import ActivityLogTable from "@/components/ActivityLogTable";
import { getActivityLogs } from "@/components/db";

export default async function ActivityPage() {
  await requireAdmin(); // chỉ Admin
  const logs = await getActivityLogs(500);
  return (
    <PageShell title="Lịch sử hoạt động" subtitle="Theo dõi mọi thao tác của từng tài khoản">
      <ActivityLogTable logs={logs as any} />
    </PageShell>
  );
}
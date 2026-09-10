import PageShell from "@/components/page-shell";
import ReportsWorkManager from "@/components/ReportsWorkManager";
import { Suspense } from "react";
import { requirePerm } from "@/lib/guard";
import { getCurrentUser } from "@/lib/auth";
import { canAccess, isAdminLike } from "@/lib/permissions";

export default async function WorkReportsPage() {
  await requirePerm("reports_work");
  const user = await getCurrentUser();
  const isAdmin = !!user && (canAccess(user, "users") || isAdminLike(user));
  const canUpload = isAdmin || (!!user && canAccess(user, "reports_work_upload"));
  const canDownload = isAdmin || (!!user && canAccess(user, "reports_work_download"));
  const canDelete = isAdmin || (!!user && canAccess(user, "reports_work_delete"));
  return (
    <PageShell
      title="Báo cáo công việc"
      subtitle="Admin giao báo cáo theo tuần/tháng - nhân viên nộp file Word"
    >
      <Suspense fallback={null}>
        <ReportsWorkManager
          isAdmin={!!isAdmin}
          canUpload={!!canUpload}
          canDownload={!!canDownload}
          canDelete={!!canDelete}
          currentUserId={user ? Number(user.id) : undefined}
        />
      </Suspense>
    </PageShell>
  );
}
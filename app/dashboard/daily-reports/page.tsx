import { requireUser } from "@/lib/guard";
import PageShell from "@/components/page-shell";
import DailyReportManager from "@/components/DailyReportManager";
import { canAccess, isAdminLike } from "@/lib/permissions";

export default async function DailyReportsPage() {
  const user = await requireUser(); // mọi user đã đăng nhập đều vào được
  const isAdmin = !!(canAccess(user, "users") || isAdminLike(user));
  // Xem tất cả: Admin hoặc được cấp quyền "viewall"
  const viewAll = isAdmin || canAccess(user, "dailyreports_viewall");
  // Được nhập/sửa: Admin, hoặc có quyền "write", hoặc tài khoản thường (chưa được gắn "viewall")
  const canWrite = isAdmin || canAccess(user, "dailyreports_write") || !canAccess(user, "dailyreports_viewall");
  return (
    <PageShell title="Nhật ký công việc" subtitle="Báo cáo công việc trong ngày của nhân viên">
      <DailyReportManager viewAll={viewAll} canWrite={canWrite} />
    </PageShell>
  );
}

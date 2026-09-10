import PageShell from "@/components/page-shell";
import UsersManager from "@/components/UsersManager";
import { requireAdmin } from "@/lib/guard";

export default async function UsersPage() {
  await requireAdmin(); // chỉ Admin mới được vào Quản lý tài khoản
  return (
    <PageShell
      title="Quản lý tài khoản"
      subtitle="Tạo tài khoản nhân viên và phân quyền sử dụng từng chức năng"
    >
      <UsersManager />
    </PageShell>
  );
}
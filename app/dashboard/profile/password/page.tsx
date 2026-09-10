import { requireUser } from "@/lib/guard";
import PageShell from "@/components/page-shell";
import ChangePasswordForm from "@/components/ChangePasswordForm";

export default async function ChangePasswordPage() {
  await requireUser();
  return (
    <PageShell title="Đổi mật khẩu" subtitle="Cập nhật mật khẩu đăng nhập cá nhân">
      <ChangePasswordForm />
    </PageShell>
  );
}

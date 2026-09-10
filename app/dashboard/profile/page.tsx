import PageShell from "@/components/page-shell";
import ProfileManager from "@/components/ProfileManager";
import { requireUser } from "@/lib/guard";

export default async function ProfilePage() {
  await requireUser(); // mọi user đã đăng nhập đều được quản lý hồ sơ của mình
  return (
    <PageShell title="Hồ sơ cá nhân" subtitle="Quản lý thông tin hiển thị của tài khoản">
      <ProfileManager />
    </PageShell>
  );
}
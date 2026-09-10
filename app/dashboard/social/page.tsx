import { requirePerm } from "@/lib/guard";
import SocialStatusPanel from "@/components/SocialStatusPanel";
import DashboardLayout from "@/components/layout";

export default async function SocialPage() {
  await requirePerm("social");

  return (
    <DashboardLayout
      title="Trạng thái mạng xã hội"
      subtitle="Báo cáo lượt follow, view, tương tác"
    >
      <SocialStatusPanel />
    </DashboardLayout>
  );
}
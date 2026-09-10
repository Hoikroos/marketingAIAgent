import { requirePerm } from "@/lib/guard";
import PageShell from "@/components/page-shell";
import AssistantChat from "@/components/AssistantChat";

export default async function AssistantPage() {
  await requirePerm("assistant");
  return (
    <PageShell title="Trợ lý AI Tân Phú Land Marketing" subtitle="Hỏi AI về số liệu marketing của bạn — nhận gợi ý hành động cụ thể">
      <AssistantChat />
    </PageShell>
  );
}
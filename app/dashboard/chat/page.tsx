import { requireUser } from "@/lib/guard";
import PageShell from "@/components/page-shell";
import ChatPanel from "@/components/ChatPanel";

export default async function ChatPage() {
  await requireUser();
  return (
    <PageShell title="Nhắn tin" subtitle="Chat & kết bạn với đồng nghiệp">
      <ChatPanel />
    </PageShell>
  );
}

import { requirePerm } from "@/lib/guard";
import PageShell from "@/components/page-shell";
import CreateContentModal from "@/components/CreateContentModal";
import ContentTable from "@/components/ContentTable";
import { getContents } from "@/components/db";

export default async function Content() {
  await requirePerm("content");
  // XEM CHUNG: mọi người đều thấy toàn bộ nội dung của team
  const contents = await getContents(200);
  return (
    <PageShell
      title="Quản lý nội dung"
      subtitle="Toàn bộ nội dung của team từ ý tưởng đến xuất bản"
    >
      <div className="flex gap-3 mb-4">
        <CreateContentModal />
      </div>
      <ContentTable contents={contents as any} />
    </PageShell>
  );
}

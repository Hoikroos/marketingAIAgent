import { requirePerm } from "@/lib/guard";
import PageShell from "@/components/page-shell";
import CreateContentForm from "@/components/CreateContentForm";

export default async function NewContentPage({
  searchParams,
}: {
  searchParams?: { title?: string; platform?: string };
}) {
  await requirePerm("content_studio");
  const title = searchParams?.title || "";
  const platform = searchParams?.platform || "";
  return (
    <PageShell title="Tạo content" subtitle="Tạo nội dung mới">
      <div className="card p-6 max-w-xl">
        <CreateContentForm initialTitle={title} initialPlatform={platform} />
      </div>
    </PageShell>
  );
}

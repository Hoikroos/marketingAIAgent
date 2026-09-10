import { requirePerm } from "@/lib/guard";
import PageShell from "@/components/page-shell";
import UtmBuilder from "@/components/UtmBuilder";

export default async function UtmBuilderPage() {
  await requirePerm("utm");
  return (
    <PageShell title="UTM Builder" subtitle="Tạo link có gắn UTM — biết chính xác lead đến từ chiến dịch nào">
      <UtmBuilder />
    </PageShell>
  );
}
import { requirePerm } from "@/lib/guard";
import PageShell from "@/components/page-shell";
import { FileBarChart } from "@/components/icons";
import { Kpi } from "@/components/ui";
import ReportsControls from "@/components/ReportsControls";
import { getOverviewStats } from "@/components/db";

export default async function Reports() {
  await requirePerm("reports");
  const stats = await getOverviewStats();
  const fmt = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);

  return (
    <PageShell title="Báo cáo" subtitle="Báo cáo hiệu suất Marketing và ROI">
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 mb-5">
        <Kpi icon={FileBarChart} label="Tổng lượt xem" value={fmt(stats.totalViews)} delta="22.6%" />
        <Kpi icon={FileBarChart} label="Tổng leads" value={String(stats.totalLeads)} delta="27.6%" />
        <Kpi icon={FileBarChart} label="Tỷ lệ chuyển đổi" value={`${stats.conversionRate}%`} delta="8.6%" />
      </div>
      <ReportsControls />
    </PageShell>
  );
}


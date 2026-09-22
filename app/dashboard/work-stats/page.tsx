import { requirePerm } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import DashboardLayout from "@/components/layout";
import WorkStatsBoard, { type WorkStatsData } from "@/components/WorkStatsBoard";

/**
 * /dashboard/work-stats — Thống kê công việc
 * Tổng hợp kết quả công việc đã hoàn thành theo TUẦN / THÁNG / QUÝ / NĂM,
 * so sánh từng kỳ và phân rã theo từng chức năng (module) của hệ thống.
 * Nguồn dữ liệu: ActivityLog (mọi thao tác trên các chức năng), Task, Content,
 * Lead, Report (báo cáo công việc), DailyReport, SocialMetric, AdCampaign.
 */
export default async function WorkStatsPage() {
  await requirePerm("reports");

  const [logs, tasks, contents, leads, reports, dailyReports, social, ads] = await Promise.all([
    prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 6000,
      select: { module: true, action: true, createdAt: true },
    }),
    prisma.task.findMany({
      take: 3000,
      orderBy: { createdAt: "desc" },
      select: { assignee: true, status: true, createdAt: true },
    }),
    prisma.content.findMany({
      take: 3000,
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    prisma.lead.findMany({
      take: 3000,
      orderBy: { createdAt: "desc" },
      select: { status: true, createdAt: true },
    }),
    prisma.report.findMany({
      take: 2000,
      orderBy: { createdAt: "desc" },
      select: { status: true, submittedAt: true },
    }),
    prisma.dailyReport.findMany({
      take: 3000,
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    prisma.socialMetric.findMany({
      take: 3000,
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    prisma.adCampaign.findMany({
      take: 1000,
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);

  const data: WorkStatsData = {
    logs: logs.map((l) => ({ module: l.module, action: l.action, createdAt: l.createdAt.toISOString() })),
    tasks: tasks.map((t) => ({ assignee: t.assignee, status: t.status, createdAt: t.createdAt.toISOString() })),
    contents: contents.map((c) => ({ createdAt: c.createdAt.toISOString() })),
    leads: leads.map((l) => ({ status: l.status, createdAt: l.createdAt.toISOString() })),
    reports: reports.map((r) => ({ status: r.status, submittedAt: r.submittedAt ? r.submittedAt.toISOString() : null })),
    dailyReports: dailyReports.map((d) => ({ createdAt: d.createdAt.toISOString() })),
    social: social.map((s) => ({ createdAt: s.createdAt.toISOString() })),
    ads: ads.map((a) => ({ createdAt: a.createdAt.toISOString() })),
  };

  return (
    <DashboardLayout
      title="Thống kê công việc"
      subtitle="Tổng hợp công việc đã hoàn thành theo tuần / tháng / quý / năm — so sánh từng kỳ và theo từng chức năng"
    >
      <WorkStatsBoard data={data} />
    </DashboardLayout>
  );
}
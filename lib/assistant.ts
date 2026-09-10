import { prisma } from "@/lib/prisma";

/**
 * Tổng hợp dữ liệu THẬT từ hệ thống làm ngữ cảnh cho Trợ lý AI tư vấn.
 * Giữ ngắn gọn để tiết kiệm token nhưng đủ phủ: leads, content, ads, MXH, trend, lịch.
 */
export async function buildContext(): Promise<string> {
  const now = new Date();
  const d7 = new Date(now.getTime() - 7 * 86400000);
  const d14 = new Date(now.getTime() - 14 * 86400000);
  const d30 = new Date(now.getTime() - 30 * 86400000);

  const [leads, contents, ads, social, trends, upcoming] = await Promise.all([
    prisma.lead.findMany({ select: { source: true, status: true, contacted: true, utmCampaign: true, createdAt: true } }),
    prisma.content.findMany({ orderBy: { createdAt: "desc" }, take: 100, select: { title: true, platform: true, type: true, views: true, leads: true, scheduledAt: true, createdAt: true } }),
    prisma.adCampaign.findMany({ select: { name: true, platform: true, status: true, spent: true, clicks: true, conversions: true, impressions: true, totalBudget: true } }),
    prisma.socialMetric.findMany({ select: { platform: true, channel: true, followers: true, views: true, engagement: true, leads: true, createdAt: true } }),
    prisma.trend.findMany({ orderBy: [{ score: "desc" }, { createdAt: "desc" }], take: 5, select: { title: true, platform: true, score: true } }),
    prisma.content.findMany({ where: { scheduledAt: { gte: now } }, orderBy: { scheduledAt: "asc" }, take: 5, select: { title: true, scheduledAt: true } }),
  ]);

  const inRange = (d: Date | null, from: Date) => d && new Date(d).getTime() >= from.getTime();

  const leads7 = leads.filter((l) => inRange(l.createdAt, d7));
  const leadsPrev7 = leads.filter((l) => inRange(l.createdAt, d14) && !inRange(l.createdAt, d7));
  const leads30 = leads.filter((l) => inRange(l.createdAt, d30));

  const bySource = new Map<string, number>();
  for (const l of leads30) bySource.set(l.source, (bySource.get(l.source) || 0) + 1);
  const topSources = [...bySource.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([s, n]) => `${s}: ${n}`).join(", ") || "không có";

  const byStatus = new Map<string, number>();
  for (const l of leads) byStatus.set(l.status, (byStatus.get(l.status) || 0) + 1);
  const statusStr = [...byStatus.entries()].map(([s, n]) => `${s}: ${n}`).join(", ") || "không có";
  const notContacted = leads.filter((l) => l.contacted === "Chưa liên hệ" && l.status !== "Đã chốt" && l.status !== "Không tiềm năng").length;

  const topContents = [...contents].sort((a, b) => b.leads - a.leads || b.views - a.views).slice(0, 3)
    .map((c) => `"${c.title}" (${c.platform}, ${c.views} views, ${c.leads} leads)`).join(" | ") || "chưa có";
  const newContents7 = contents.filter((c) => inRange(c.createdAt, d7)).length;

  const spend = ads.reduce((s, a) => s + a.spent, 0);
  const conv = ads.reduce((s, a) => s + a.conversions, 0);
  const clicks = ads.reduce((s, a) => s + a.clicks, 0);
  const cpl = conv > 0 ? Math.round(spend / conv) : null;
  const adLines = ads.slice(0, 5).map((a) => {
    const c = a.conversions > 0 ? `, CPL ${Math.round(a.spent / a.conversions)}` : ", chưa có conversion";
    return `${a.name} [${a.platform}, ${a.status}, chi ${Math.round(a.spent)}, ${a.clicks} clicks${c}]`;
  }).join("; ") || "chưa có chiến dịch";

  const followers = social.reduce((s, m) => s + m.followers, 0);
  const views7 = (social as any[]).filter((m) => inRange(m.createdAt, d7)).reduce((s, m) => s + m.views, 0);
  const eng7 = (social as any[]).filter((m) => inRange(m.createdAt, d7)).reduce((s, m) => s + m.engagement, 0);
  const leadsFromSocial7 = (social as any[]).filter((m) => inRange(m.createdAt, d7)).reduce((s, m) => s + m.leads, 0);

  const trendStr = trends.map((t) => `${t.title} [${t.platform}, độ nóng ${t.score}]`).join(" | ") || "chưa có";
  const upcomingStr = upcoming.map((c) => `"${c.title}" (${c.scheduledAt ? new Date(c.scheduledAt).toLocaleString("vi-VN") : "?"})`).join(" | ") || "không có";

  return [
    `LEADS: tuần này ${leads7} (tuần trước ${leadsPrev7}), 30 ngày ${leads30}, tổng chưa liên hệ: ${notContacted}`,
    `Leads theo nguồn 30 ngày: ${topSources}`,
    `Trạng thái leads: ${statusStr}`,
    `CONTENT: ${contents.length} tổng, ${newContents7} tạo mới trong 7 ngày qua; top hiệu quả: ${topContents}`,
    `LỊCH SẮP TỚI: ${upcomingStr}`,
    `ADS: chi tổng ${Math.round(spend)}, ${clicks} clicks, ${conv} conversions${cpl ? `, CPL TB ${cpl}` : ""}; chiến dịch: ${adLines}`,
    `MXH: ${followers} followers; 7 ngày qua: ${views7} views, ${eng7} tương tác, ${leadsFromSocial7} leads`,
    `TREND BĐS hot: ${trendStr}`,
  ].join("\n");
}
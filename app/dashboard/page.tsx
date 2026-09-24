import { requirePerm } from "@/lib/guard";
import DashboardLayout from "@/components/layout";
import { Kpi, Status } from "@/components/ui";
import { ReportChart } from "@/components/charts";
import GeneralReportPanel from "@/components/GeneralReportPanel";
import SocialReportPanel from "@/components/SocialReportPanel";
import { Suspense } from "react";
import {
  Eye,
  Heart,
  Users,
  Files,
  Flame,
  CalendarDays,
  Sparkles,
  Megaphone,
  Target,
  ClipboardList,
  Share2,
  Clock3,
  TrendingUp,
  Plus,
  ArrowUpRight,
} from "@/components/icons";
import { getContents, getOverviewStats, getTopContents, getUpcomingContents, getLeads } from "@/components/db";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { canAccess, canExportGeneralReportWord, canSynthesizeGeneralReport, isAdminLike } from "@/lib/permissions";
import {
  latestChannelRows,
  socialStatsByMonth,
  socialStatsByWeek,
  totalFollowers as socialFollowerTotal,
  type SocialMetricRow,
} from "@/lib/socialStats";

function weekLabel(d: Date) {
  const start = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

function fmt(n: number) {
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1_000).toFixed(1)}K` : String(n);
}

const PRIORITY_CLS: Record<string, string> = {
  "Cao nhất": "bg-rose-500/15 text-rose-400",
  Cao: "bg-amber-500/15 text-amber-400",
  "Trung bình": "bg-sky-500/15 text-sky-400",
  Thấp: "bg-slate-500/15 text-slate-400",
};

const LEAD_STAGES = ["Mới", "Quan tâm", "Đang tư vấn", "Đã chốt", "Không tiềm năng"];
const LEAD_STAGE_CLS: Record<string, string> = {
  Mới: "bg-sky-400",
  "Quan tâm": "bg-violet-400",
  "Đang tư vấn": "bg-amber-400",
  "Đã chốt": "bg-emerald-400",
  "Không tiềm năng": "bg-slate-600",
};

export default async function Dashboard() {
  await requirePerm("dashboard");
  const user = await getCurrentUser();
  const name = user?.name?.split(" ").slice(-1)[0] || user?.name || "";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Chào buổi sáng" : hour < 18 ? "Chào buổi chiều" : "Chào buổi tối";
  const today = new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const canStudio = canAccess(user, "content_studio");
  const canCalendar = canAccess(user, "calendar");
  const canContent = canAccess(user, "content");
  const canLeads = canAccess(user, "leads");
  const canAds = canAccess(user, "ads");
  const canSocial = canAccess(user, "social");
  const canTrends = canAccess(user, "trends");
  const canTeam = canAccess(user, "team");
  // Báo cáo chung tháng: 2 quyền TÁCH BIỆT cho nút "Tổng hợp bằng AI" và "Tải file Word"
  const canSynthesizeGeneral = canSynthesizeGeneralReport(user);
  const canExportGeneralWord = canExportGeneralReportWord(user);

  const contentScope = isAdminLike(user) ? undefined : Number(user?.id) || 0;
  const trendScope = isAdminLike(user) ? {} : { ownerId: Number(user?.id) || 0 };
  const [topContents, allContents, upcoming, stats, leads, ads, social, trends, allTasks, leadGroups] = await Promise.all([
    getTopContents(3, contentScope),
    getContents(300, contentScope),
    getUpcomingContents(5, contentScope),
    getOverviewStats(),
    getLeads(6),
    canAds ? prisma.adCampaign.findMany({ orderBy: { createdAt: "desc" } }) : Promise.resolve([]),
    canSocial ? prisma.socialMetric.findMany() : Promise.resolve([]),
    canTrends ? prisma.trend.findMany({ where: trendScope, orderBy: [{ score: "desc" }, { createdAt: "desc" }], take: 4 }) : Promise.resolve([]),
    canTeam ? prisma.task.findMany({ orderBy: { id: "desc" }, take: 80 }) : Promise.resolve([]),
    canLeads ? prisma.lead.groupBy({ by: ["status"], _count: { _all: true } }) : Promise.resolve([]),
  ]);

  // ---- Tổng hợp Ads ----
  const adActive = ads.filter((a) => a.status === "Đang chạy");
  const adSpend = ads.reduce((s: number, a: any) => s + a.spent, 0);
  const adClicks = ads.reduce((s: number, a: any) => s + a.clicks, 0);

  // ---- MXH theo tuần (từ SocialMetric) ----
  const socialRows = (social as unknown as SocialMetricRow[]) || [];
  const byWeek = new Map<string, { views: number; eng: number }>();
  for (const m of socialRows) {
    const w = byWeek.get(m.weekLabel) || { views: 0, eng: 0 };
    w.views += m.views;
    w.eng += m.engagement;
    byWeek.set(m.weekLabel, w);
  }
  const weeksSorted = [...byWeek.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const chartData = weeksSorted.slice(-8).map(([d, v]) => ({ d: d.replace(/^\d{4}-/, ""), views: v.views, eng: v.eng }));
  const lastW = weeksSorted[weeksSorted.length - 1]?.[1];
  const prevW = weeksSorted[weeksSorted.length - 2]?.[1];
  const viewsGrowth = lastW && prevW && prevW.views > 0 ? ((lastW.views - prevW.views) / prevW.views) * 100 : null;

  // ---- Báo cáo MXH theo tuần / tháng (khối "Báo cáo mạng xã hội" trên Dashboard) ----
  // Lượt follow = ảnh chụp MỚI NHẤT của mỗi kênh (không cộng dồn qua các tuần);
  // video đã đăng / view / tương tác = cộng dồn theo kỳ; avgViews = view ÷ video.
  const totalFollowers = socialFollowerTotal(socialRows);
  const socialWeekly = socialStatsByWeek(socialRows, 8);
  const socialMonthly = socialStatsByMonth(socialRows, 6);
  const socialChannels = latestChannelRows(socialRows);

  // ---- Phễu leads ----
  const leadCountMap = new Map((leadGroups as any[]).map((g) => [g.status, g._count._all]));
  const maxLeadStage = Math.max(1, ...LEAD_STAGES.map((s) => leadCountMap.get(s) || 0));

  // ---- Việc của tôi ----
  const myTasks = (allTasks as any[])
    .filter((t) => user?.name && (t.assignee || "").includes(user.name) && t.status !== "Hoàn thành")
    .slice(0, 4);

  const scheduledCount = allContents.filter((c) => c.scheduledAt).length;

  const quickActions = [
    canStudio && { href: "/dashboard/content-studio", icon: Sparkles, label: "Studio AI", desc: "Tạo content", cls: "from-violet-500/20 text-violet-300" },
    canTrends && { href: "/dashboard/trends", icon: Flame, label: "Xu hướng BĐS", desc: "Trend & tin nóng", cls: "from-amber-500/20 text-amber-300" },
    canLeads && { href: "/dashboard/leads", icon: Users, label: "Leads", desc: `${stats.totalLeads} khách hàng`, cls: "from-emerald-500/20 text-emerald-300" },
    canCalendar && { href: "/dashboard/calendar", icon: CalendarDays, label: "Lịch", desc: `${upcoming.length} sắp đăng`, cls: "from-sky-500/20 text-sky-300" },
  ].filter(Boolean) as { href: string; icon: any; label: string; desc: string; cls: string }[];

  return (
    <DashboardLayout title="Bảng điều khiển" subtitle="Tổng quan hoạt động marketing bất động sản">
      {/* Chào hỏi */}
      <div className="card p-5 mb-5 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-[#1b98e0]/10 to-transparent">
        <div>
          <div className="text-lg font-extrabold">
            {greeting}{name ? `, ${name}` : ""} 👋
          </div>
          <div className="text-xs text-slate-400 mt-1 capitalize">{today}</div>
        </div>
        {canStudio && (
          <Link href="/dashboard/content-studio/new" className="btn-primary text-xs">
            <Sparkles size={14} /> Tạo content với AI
          </Link>
        )}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3 mb-5">
        <Kpi icon={Eye} label="Lượt xem (content)" value={fmt(stats.totalViews)} />
        <Kpi icon={Users} label="Leads" value={String(stats.totalLeads)} />
        <Kpi icon={Files} label="Nội dung" value={String(stats.contentCount)} delta={`${scheduledCount} đã lên lịch`} />
        {canAds && <Kpi icon={Megaphone} label="Chi tiêu ads" value={fmt(Math.round(adSpend))} delta={`${adActive.length} đang chạy`} />}
        {canSocial && <Kpi icon={Share2} label="Followers MXH" value={fmt(totalFollowers)} delta={viewsGrowth !== null ? `${viewsGrowth >= 0 ? "+" : ""}${viewsGrowth.toFixed(0)}% views tuần này` : undefined} tone={viewsGrowth === null || viewsGrowth >= 0 ? "up" : "down"} />}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {quickActions.map((a) => (
          <Link key={a.href} href={a.href} className={`card p-4 bg-gradient-to-br ${a.cls} to-transparent hover:border-[#1b98e0]/50 transition group`}>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[var(--panel2)] grid place-items-center shrink-0">
                <a.icon size={19} />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-sm truncate">{a.label}</div>
                <div className="text-[11px] text-slate-400 truncate">{a.desc}</div>
              </div>
              <ArrowUpRight size={15} className="ml-auto text-slate-500 group-hover:text-[#1b98e0] transition" />
            </div>
          </Link>
        ))}
      </div>

      {/* Biểu đồ + Phễu */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="font-extrabold text-sm tracking-tight">HIỆU SUẤT MẠNG XÃ HỘI THEO TUẦN</div>
            {viewsGrowth !== null && (
              <span className={`text-[11px] font-bold px-2 py-1 rounded-lg ${viewsGrowth >= 0 ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"}`}>
                {viewsGrowth >= 0 ? "▲" : "▼"} {Math.abs(viewsGrowth).toFixed(0)}% tuần này
              </span>
            )}
          </div>
          {chartData.length > 0 ? (
            <ReportChart data={chartData} />
          ) : (
            <div className="h-40 grid place-items-center text-xs text-slate-400">
              Chưa có số liệu MXH — nhập số liệu ở trang <Link href="/dashboard/social" className="text-[#1b98e0] mx-1">Mạng xã hội</Link> để xem biểu đồ.
            </div>
          )}
        </div>

        {canLeads && (
          <div className="card p-5">
            <div className="font-extrabold text-sm tracking-tight mb-4">PHỄU KHÁCH HÀNG</div>
            <div className="space-y-3">
              {LEAD_STAGES.map((stage) => {
                const count = leadCountMap.get(stage) || 0;
                return (
                  <div key={stage}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-300">{stage}</span>
                      <span className="font-bold">{count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--panel2)] overflow-hidden">
                      <div className={`h-full rounded-full ${LEAD_STAGE_CLS[stage]}`} style={{ width: `${(count / maxLeadStage) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <Link href="/dashboard/leads" className="mt-4 block text-center text-xs font-bold bg-[#1b98e0] hover:bg-[#1376b0] text-white rounded-lg py-2">
              Quản lý leads →
            </Link>
          </div>
        )}
      </div>

      {/* BÁO CÁO MẠNG XÃ HỘI — lượt follow, video đã đăng, view TB/video theo tuần / tháng */}
      {canSocial && <SocialReportPanel weekly={socialWeekly} monthly={socialMonthly} channels={socialChannels} />}

      {/* Lưới chính */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Cột trái */}
        <div className="lg:col-span-2 space-y-4">
          {/* Nội dung nổi bật */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="font-extrabold text-sm tracking-tight flex items-center gap-2">
                <Flame size={15} className="text-amber-400" /> NỘI DUNG NỔI BẬT
              </div>
              {canContent && <Link href="/dashboard/content" className="text-[11px] text-[#1b98e0] hover:underline">Xem tất cả →</Link>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {topContents.map((c: any, i: number) => (
                <div key={c.id} className="rounded-xl bg-[var(--panel2)] p-3 relative overflow-hidden">
                  <div className="absolute top-2 right-2 text-[10px] font-black text-slate-600">#{i + 1}</div>
                  <div className="font-bold text-sm leading-snug line-clamp-2 pr-5">{c.title}</div>
                  <div className="text-[10px] text-slate-400 mt-1">{c.platform} · {c.type}</div>
                  <div className="flex items-center gap-3 mt-2 text-xs">
                    <span className="text-sky-400 font-bold">{fmt(c.views)} views</span>
                    <span className="text-slate-400">🎯 {fmt(c.leads)} leads</span>
                  </div>
                </div>
              ))}
              {topContents.length === 0 && <p className="text-xs text-slate-400 col-span-3">Chưa có nội dung nào.</p>}
            </div>
            {scheduledCount > 0 && (
              <div className="text-[11px] text-slate-400 mt-3">
                📅 {scheduledCount} nội dung đã lên lịch đăng — xem chi tiết ở Lịch nội dung.
              </div>
            )}
          </div>

          {/* Lịch sắp tới */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="font-extrabold text-sm tracking-tight flex items-center gap-2">
                <CalendarDays size={15} className="text-sky-400" /> LỊCH ĐĂNG SẮP TỚI
              </div>
              {canCalendar && <Link href="/dashboard/calendar" className="text-[11px] text-[#1b98e0] hover:underline">Lịch đầy đủ →</Link>}
            </div>
            <div className="space-y-2">
              {upcoming.map((c: any) => {
                const d = c.scheduledAt ? new Date(c.scheduledAt) : null;
                return (
                  <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--panel2)] transition">
                    <div className="h-10 w-10 rounded-lg bg-[#1b98e0]/15 grid place-items-center shrink-0">
                      <div className="text-center leading-none">
                        <div className="text-[9px] text-[#1b98e0]">{d ? d.toLocaleDateString("vi-VN", { month: "short" }) : "--"}</div>
                        <div className="text-sm font-black text-[#1b98e0]">{d ? d.getDate() : "?"}</div>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-xs truncate">{c.title}</div>
                      <div className="text-[10px] text-slate-400">{c.platform} · {c.type}{d ? ` · ${d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}` : ""}</div>
                    </div>
                    <Status>{c.status}</Status>
                  </div>
                );
              })}
              {upcoming.length === 0 && <p className="text-xs text-slate-400">Không có nội dung nào được lên lịch.</p>}
            </div>
          </div>

          {/* Xu hướng & tin nóng */}
          {canTrends && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="font-extrabold text-sm tracking-tight flex items-center gap-2">
                  <Flame size={15} className="text-amber-400" /> TIN NÓNG & XU HƯỚNG BĐS
                </div>
                <Link href="/dashboard/trends" className="text-[11px] text-[#1b98e0] hover:underline">Tất cả →</Link>
              </div>
              <div className="space-y-2">
                {trends.map((t: any) => (
                  <div key={t.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-[var(--panel2)] transition">
                    <div className="h-8 w-8 rounded-lg bg-amber-500/15 grid place-items-center shrink-0">
                      <Flame size={14} className="text-amber-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold line-clamp-1">{t.title}</div>
                      <div className="text-[10px] text-slate-400">{t.platform} · {t.category}</div>
                    </div>
                    <div className="text-xs font-black text-amber-400 shrink-0">{t.score}</div>
                  </div>
                ))}
                {(trends as any[]).length === 0 && (
                  <p className="text-xs text-slate-400">
                    Chưa có trend. <Link href="/dashboard/trends" className="text-[#1b98e0]">Thu thập ngay →</Link>
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Cột phải */}
        <div className="space-y-4">
          {/* Quảng cáo */}
          {canAds && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="font-extrabold text-sm tracking-tight flex items-center gap-2">
                  <Megaphone size={15} className="text-violet-400" /> QUẢNG CÁO
                </div>
                <Link href="/dashboard/ads" className="text-[11px] text-[#1b98e0] hover:underline">Tất cả →</Link>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="rounded-lg bg-[var(--panel2)] p-2.5">
                  <div className="text-[10px] text-slate-400">Đang chạy</div>
                  <div className="text-lg font-black text-violet-300">{adActive.length}</div>
                </div>
                <div className="rounded-lg bg-[var(--panel2)] p-2.5">
                  <div className="text-[10px] text-slate-400">Chi tiêu</div>
                  <div className="text-lg font-black text-violet-300">{fmt(Math.round(adSpend))}</div>
                </div>
              </div>
              <div className="space-y-2">
                {ads.slice(0, 3).map((a: any) => {
                  const pct = a.totalBudget > 0 ? Math.min(100, (a.spent / a.totalBudget) * 100) : 0;
                  return (
                    <div key={a.id} className="p-2 rounded-lg bg-[var(--panel2)]">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-bold truncate">{a.name}</div>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/10 text-slate-300 shrink-0">{a.platform}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-black/30 overflow-hidden mt-1.5">
                        <div className="h-full bg-gradient-to-r from-violet-400 to-[#1b98e0]" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        {fmt(Math.round(a.spent))}/{fmt(Math.round(a.totalBudget))} · {fmt(a.clicks)} clicks
                      </div>
                    </div>
                  );
                })}
                {ads.length === 0 && <p className="text-xs text-slate-400">Chưa có chiến dịch nào.</p>}
              </div>
            </div>
          )}

          {/* Việc của tôi */}
          {canTeam && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="font-extrabold text-sm tracking-tight flex items-center gap-2">
                  <ClipboardList size={15} className="text-cyan-400" /> VIỆC CỦA TÔI
                </div>
                <Link href="/dashboard/team" className="text-[11px] text-[#1b98e0] hover:underline">Tất cả →</Link>
              </div>
              <div className="space-y-2">
                {myTasks.map((t: any) => {
                  const overdue = t.deadline && new Date(t.deadline) < new Date();
                  return (
                    <div key={t.id} className="p-2.5 rounded-lg bg-[var(--panel2)]">
                      <div className="text-xs font-bold line-clamp-1">{t.title}</div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${PRIORITY_CLS[t.priority] || PRIORITY_CLS["Trung bình"]}`}>{t.priority}</span>
                        {t.deadline && (
                          <span className={`text-[10px] flex items-center gap-0.5 ${overdue ? "text-rose-400" : "text-slate-400"}`}>
                            <Clock3 size={10} />
                            {new Date(t.deadline).toLocaleDateString("vi-VN")}
                            {overdue ? " (quá hạn)" : ""}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 ml-auto">{t.status}</span>
                      </div>
                    </div>
                  );
                })}
                {myTasks.length === 0 && <p className="text-xs text-slate-400">Không có việc nào đang làm. 🎉</p>}
              </div>
            </div>
          )}

          {/* Leads mới nhất */}
          {canLeads && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="font-extrabold text-sm tracking-tight flex items-center gap-2">
                  <Target size={15} className="text-emerald-400" /> LEADS MỚI NHẤT
                </div>
                <Link href="/dashboard/leads" className="text-[11px] text-[#1b98e0] hover:underline">Tất cả →</Link>
              </div>
              <div className="space-y-2">
                {leads.map((l: any) => (
                  <div key={l.id} className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-[var(--panel2)] transition">
                    <div className="min-w-0">
                      <div className="font-bold text-xs truncate">{l.name}</div>
                      <div className="text-[10px] text-slate-400">{l.phone || "—"} · {l.source}</div>
                    </div>
                    <Status>{l.status}</Status>
                  </div>
                ))}
                {leads.length === 0 && <p className="text-xs text-slate-400">Chưa có lead nào.</p>}
              </div>
              <Link href="/dashboard/leads/new" className="mt-3 flex items-center justify-center gap-1 text-xs font-bold bg-[#1b98e0] hover:bg-[#1376b0] text-white rounded-lg py-2">
                <Plus size={13} /> Thêm lead
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* BÁO CÁO CHUNG THÁNG — AI tổng hợp báo cáo tuần của từng nhân viên */}
      <Suspense fallback={null}>
        <GeneralReportPanel canSynthesize={canSynthesizeGeneral} canExportWord={canExportGeneralWord} />
      </Suspense>
    </DashboardLayout>
  );
}
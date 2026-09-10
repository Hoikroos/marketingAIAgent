import { requirePerm } from "@/lib/guard";
import DashboardLayout from "@/components/layout";
import { prisma } from "@/lib/prisma";
import {
  Users,
  Files,
  Eye,
  Heart,
  Megaphone,
  Flame,
  Target,
  TrendingUp,
  Share2,
} from "@/components/icons";
import Link from "next/link";

function fmt(n: number) {
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1_000).toFixed(1)}K` : String(n);
}
function vnd(n: number) {
  return Math.round(n).toLocaleString("vi-VN");
}
function pct(cur: number, prev: number): number | null {
  if (!prev) return cur > 0 ? 100 : null;
  return ((cur - prev) / prev) * 100;
}
function DeltaBadge({ p }: { p: number | null }) {
  if (p === null) return null;
  const up = p >= 0;
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${up ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"}`}>
      {up ? "▲" : "▼"} {Math.abs(p).toFixed(0)}% vs kỳ trước
    </span>
  );
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams?: { p?: string };
}) {
  await requirePerm("analytics");
  const days = [7, 30, 90].includes(Number(searchParams?.p)) ? Number(searchParams?.p) : 30;
  const now = new Date();
  const start = new Date(now.getTime() - days * 86400000);
  const prevStart = new Date(now.getTime() - 2 * days * 86400000);

  const [contents, ads, social, leadsAll] = await Promise.all([
    prisma.content.findMany({ select: { title: true, platform: true, type: true, views: true, leads: true, createdAt: true } }),
    prisma.adCampaign.findMany(),
    prisma.socialMetric.findMany(),
    prisma.lead.findMany({ select: { source: true, status: true, utmCampaign: true, createdAt: true } }),
  ]);

  const inRange = (d: Date | null, from: Date, to?: Date) => {
    if (!d) return false;
    const t = new Date(d).getTime();
    return t >= from.getTime() && (to ? t < to.getTime() : true);
  };

  // ---- KPI theo kỳ + so kỳ trước ----
  const leadsCur = leadsAll.filter((l) => inRange(l.createdAt, start)).length;
  const leadsPrev = leadsAll.filter((l) => inRange(l.createdAt, prevStart, start)).length;
  const contentsCur = contents.filter((c) => inRange(c.createdAt, start)).length;
  const contentsPrev = contents.filter((c) => inRange(c.createdAt, prevStart, start)).length;
  const socialCur = (social as any[]).filter((m) => inRange(m.createdAt, start));
  const socialPrev = (social as any[]).filter((m) => inRange(m.createdAt, prevStart, start));
  const viewsCur = socialCur.reduce((s, m) => s + m.views, 0);
  const viewsPrev = socialPrev.reduce((s, m) => s + m.views, 0);
  const engCur = socialCur.reduce((s, m) => s + m.engagement, 0);
  const engPrev = socialPrev.reduce((s, m) => s + m.engagement, 0);

  // ---- Ads: CPL ----
  const spendTotal = ads.reduce((s: number, a: any) => s + a.spent, 0);
  const convTotal = ads.reduce((s: number, a: any) => s + a.conversions, 0);
  const clickTotal = ads.reduce((s: number, a: any) => s + a.clicks, 0);
  const cplAvg = convTotal > 0 ? spendTotal / convTotal : null;
  const campaignsCPL = (ads as any[])
    .map((a) => ({ ...a, cpl: a.conversions > 0 ? a.spent / a.conversions : null }))
    .sort((a, b) => (a.cpl !== null && b.cpl !== null ? a.cpl - b.cpl : a.cpl !== null ? -1 : b.cpl !== null ? 1 : b.conversions - a.conversions));

  // ---- Top nội dung theo lead ----
  const topContents = [...contents].sort((a, b) => b.leads - a.leads || b.views - a.views).slice(0, 8);

  // ---- So sánh kênh ----
  const platforms = Array.from(new Set([...contents.map((c) => c.platform), ...leadsAll.map((l) => l.source), ...(social as any[]).map((m) => m.platform)])).filter(Boolean);
  const channelRows = platforms.map((pf) => {
    const ct = contents.filter((c) => c.platform === pf);
    const sm = (social as any[]).filter((m) => m.platform === pf);
    const ld = leadsAll.filter((l) => l.source === pf);
    return {
      platform: pf,
      views: ct.reduce((s, c) => s + c.views, 0) + sm.reduce((s, m) => s + m.views, 0),
      engagement: sm.reduce((s, m) => s + m.engagement, 0),
      contentLeads: ct.reduce((s, c) => s + c.leads, 0) + sm.reduce((s, m) => s + m.leads, 0),
      leadCount: ld.length,
      won: ld.filter((l) => l.status === "Đã chốt").length,
    };
  }).sort((a, b) => b.leadCount - a.leadCount || b.views - a.views);

  // ---- Leads theo tuần (8 tuần) ----
  const weekMap = new Map<string, number>();
  for (const l of leadsAll) {
    const d = new Date(l.createdAt);
    const jan1 = new Date(d.getFullYear(), 0, 1);
    const w = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
    const key = `W${String(w).padStart(2, "0")}`;
    weekMap.set(key, (weekMap.get(key) || 0) + 1);
  }
  const weeklyLeads = [...weekMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-8);
  const maxWeekly = Math.max(1, ...weeklyLeads.map(([, v]) => v));

  // ---- Leads theo UTM campaign ----
  const utmMap = new Map<string, number>();
  for (const l of leadsAll) {
    if (l.utmCampaign) utmMap.set(l.utmCampaign, (utmMap.get(l.utmCampaign) || 0) + 1);
  }
  const topUtm = [...utmMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxUtm = Math.max(1, ...topUtm.map(([, v]) => v));

  return (
    <DashboardLayout title="Phân tích Marketing" subtitle="Đo hiệu quả nội dung, quảng cáo và kênh — trả lời: đang làm tốt ở đâu?">
      {/* Tabs kỳ */}
      <div className="flex items-center gap-1.5 mb-5">
        <span className="text-xs text-slate-400 mr-1">Khoảng:</span>
        {[7, 30, 90].map((d) => (
          <Link
            key={d}
            href={`/dashboard/analytics?p=${d}`}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${days === d ? "bg-[#1b98e0] text-white" : "bg-[var(--panel2)] text-slate-300 hover:bg-[var(--panel2)]/70"}`}
          >
            {d} ngày
          </Link>
        ))}
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3 mb-5">
        <div className="card p-4">
          <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-1"><Users size={13} /> Leads mới ({days} ngày)</div>
          <div className="text-2xl font-black">{leadsCur}</div>
          <div className="mt-1"><DeltaBadge p={pct(leadsCur, leadsPrev)} /></div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-1"><Files size={13} /> Nội dung mới</div>
          <div className="text-2xl font-black">{contentsCur}</div>
          <div className="mt-1"><DeltaBadge p={pct(contentsCur, contentsPrev)} /></div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-1"><Eye size={13} /> Views MXH</div>
          <div className="text-2xl font-black">{fmt(viewsCur)}</div>
          <div className="mt-1"><DeltaBadge p={pct(viewsCur, viewsPrev)} /></div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-1"><Heart size={13} /> Tương tác MXH</div>
          <div className="text-2xl font-black">{fmt(engCur)}</div>
          <div className="mt-1"><DeltaBadge p={pct(engCur, engPrev)} /></div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-1"><Megaphone size={13} /> Chi tiêu ads</div>
          <div className="text-2xl font-black">{vnd(spendTotal)}</div>
          <div className="mt-1 text-[10px] text-slate-400">
            {convTotal > 0 ? `CPL trung bình: ${vnd(cplAvg || 0)}` : "Chưa có conversion"}
          </div>
        </div>
      </div>

      {/* Top nội dung + So sánh kênh */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-5">
        <div className="xl:col-span-2 card p-5 overflow-hidden">
          <div className="font-extrabold text-sm tracking-tight mb-3 flex items-center gap-2">
            <Flame size={15} className="text-amber-400" /> NỘI DUNG RA NHIỀU LEAD NHẤT
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400 text-left border-b border-[var(--border-soft)]">
                  <th className="py-2 pr-2 font-medium">#</th>
                  <th className="py-2 pr-2 font-medium">Tiêu đề</th>
                  <th className="py-2 pr-2 font-medium">Nền tảng</th>
                  <th className="py-2 pr-2 font-medium text-right">Views</th>
                  <th className="py-2 pr-2 font-medium text-right">Leads</th>
                  <th className="py-2 font-medium text-right">Tỉ lệ</th>
                </tr>
              </thead>
              <tbody>
                {topContents.map((c, i) => (
                  <tr key={i} className="border-b border-[var(--border-soft)]/50 hover:bg-[var(--panel2)]/50">
                    <td className="py-2 pr-2 font-black text-slate-500">{i + 1}</td>
                    <td className="py-2 pr-2 font-bold line-clamp-1 max-w-[240px]">{c.title}</td>
                    <td className="py-2 pr-2 text-slate-400">{c.platform}</td>
                    <td className="py-2 pr-2 text-right">{fmt(c.views)}</td>
                    <td className="py-2 pr-2 text-right font-black text-emerald-400">{c.leads}</td>
                    <td className="py-2 text-right text-slate-400">{c.views > 0 ? ((c.leads / c.views) * 100).toFixed(1) + "%" : "—"}</td>
                  </tr>
                ))}
                {topContents.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-slate-400">Chưa có nội dung.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card p-5">
          <div className="font-extrabold text-sm tracking-tight mb-3 flex items-center gap-2">
            <Share2 size={15} className="text-sky-400" /> SO SÁNH KÊNH
          </div>
          <div className="space-y-3">
            {channelRows.map((r) => (
              <div key={r.platform} className="p-3 rounded-lg bg-[var(--panel2)]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs">{r.platform}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-bold">{r.leadCount} leads</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-400">
                  <div>👁 {fmt(r.views)}</div>
                  <div>❤ {fmt(r.engagement)}</div>
                  <div>🎯 {fmt(r.contentLeads)}</div>
                </div>
              </div>
            ))}
            {channelRows.length === 0 && <p className="text-xs text-slate-400">Chưa có dữ liệu.</p>}
          </div>
        </div>
      </div>

      {/* Hiệu quả campaign (CPL) */}
      <div className="card p-5 mb-5 overflow-hidden">
        <div className="font-extrabold text-sm tracking-tight mb-3 flex items-center gap-2">
          <Target size={15} className="text-violet-400" /> HIỆU QUẢ CHIẾN DỊCH — CPL (chi phí / lead)
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-400 text-left border-b border-[var(--border-soft)]">
                <th className="py-2 pr-2 font-medium">Chiến dịch</th>
                <th className="py-2 pr-2 font-medium">Nền tảng</th>
                <th className="py-2 pr-2 font-medium">Trạng thái</th>
                <th className="py-2 pr-2 font-medium text-right">Chi tiêu</th>
                <th className="py-2 pr-2 font-medium text-right">Clicks</th>
                <th className="py-2 pr-2 font-medium text-right">Conversions</th>
                <th className="py-2 font-medium text-right">CPL</th>
              </tr>
            </thead>
            <tbody>
              {campaignsCPL.map((a) => (
                <tr key={a.id} className="border-b border-[var(--border-soft)]/50 hover:bg-[var(--panel2)]/50">
                  <td className="py-2 pr-2 font-bold line-clamp-1 max-w-[220px]">{a.name}</td>
                  <td className="py-2 pr-2 text-slate-400">{a.platform}</td>
                  <td className="py-2 pr-2 text-slate-400">{a.status}</td>
                  <td className="py-2 pr-2 text-right">{vnd(a.spent)}</td>
                  <td className="py-2 pr-2 text-right">{fmt(a.clicks)}</td>
                  <td className="py-2 pr-2 text-right font-bold text-emerald-400">{a.conversions}</td>
                  <td className="py-2 text-right font-black">
                    {a.cpl !== null ? (
                      <span className={a.cpl <= (cplAvg || Infinity) ? "text-emerald-400" : "text-amber-400"}>{vnd(a.cpl)}</span>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {campaignsCPL.length === 0 && <tr><td colSpan={7} className="py-6 text-center text-slate-400">Chưa có chiến dịch nào.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-slate-400 mt-2">
          CPL thấp = chiến dịch hiệu quả (màu xanh). "—" = chưa ghi nhận conversion — nhập số liệu conversions ở trang Chạy quảng cáo.
        </p>
      </div>

      {/* Leads theo tuần + UTM */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="font-extrabold text-sm tracking-tight mb-4 flex items-center gap-2">
            <TrendingUp size={15} className="text-emerald-400" /> LEADS THEO TUẦN
          </div>
          <div className="flex items-end gap-2 h-40">
            {weeklyLeads.map(([w, v]) => (
              <div key={w} className="flex-1 flex flex-col items-center gap-1">
                <div className="text-[10px] font-bold text-slate-300">{v}</div>
                <div className="w-full rounded-t-lg bg-gradient-to-t from-[#1b98e0] to-sky-400" style={{ height: `${(v / maxWeekly) * 100}%`, minHeight: 4 }} />
                <div className="text-[9px] text-slate-500">{w}</div>
              </div>
            ))}
            {weeklyLeads.length === 0 && <p className="text-xs text-slate-400">Chưa có lead nào.</p>}
          </div>
        </div>

        <div className="card p-5">
          <div className="font-extrabold text-sm tracking-tight mb-4 flex items-center gap-2">
            <Target size={15} className="text-violet-400" /> LEADS THEO CHIẾN DỊCH (UTM)
          </div>
          <div className="space-y-3">
            {topUtm.map(([name, v]) => (
              <div key={name}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="line-clamp-1 font-medium">{name}</span>
                  <span className="font-black">{v}</span>
                </div>
                <div className="h-2 rounded-full bg-[var(--panel2)] overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-[#1b98e0]" style={{ width: `${(v / maxUtm) * 100}%` }} />
                </div>
              </div>
            ))}
            {topUtm.length === 0 && (
              <p className="text-xs text-slate-400">
                Chưa có lead gắn UTM. Dùng <Link href="/dashboard/tools/utm" className="text-[#1b98e0]">UTM Builder</Link> tạo link quảng cáo để đo nguồn lead.
              </p>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
import { requirePerm } from "@/lib/guard";
import PageShell from "@/components/page-shell";
import CreateLeadModal from "@/components/CreateLeadModal";
import LeadsTable from "@/components/LeadsTable";
import ExportLeadsButton from "@/components/ExportLeadsButton";
import LeadsTimeStats from "@/components/LeadsTimeStats";
import { Suspense } from "react";
import { Users, UserPlus, Phone, MessageCircle, Facebook } from "@/components/icons";
import { getLeads, getStaffUsers } from "@/components/db";
import { prisma } from "@/lib/prisma";
import { periodKey, periodLabel, type Gran } from "@/lib/workStats";

function monthKey(d: Date | string) {
  const date = new Date(d);
  return `${date.getFullYear()}-${date.getMonth() + 1}`;
}
function monthLabel(key: string) {
  const [y, m] = key.split("-");
  return `Tháng ${m}/${y}`;
}

/** Tuần bắt đầu từ thứ Hai (giống lib/automation.ts) */
function mondayOf(d: Date) {
  const m = new Date(d);
  m.setHours(0, 0, 0, 0);
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  return m;
}

/** Cửa sổ thời gian của kỳ thứ i lùi về trước (i=0 → kỳ hiện tại) */
function windowFor(gran: Gran, i: number): { start: Date; end: Date } {
  const now = new Date();
  if (gran === "week") {
    const start = mondayOf(now);
    start.setDate(start.getDate() - 7 * i);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return { start, end };
  }
  const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
  const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
  return { start, end };
}

const fmtD = (d: Date) => d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
const LEAD_STATUSES = ["Mới", "Đang tư vấn", "Đã chốt", "Không tiềm năng"];

export default async function Leads() {
  await requirePerm("leads");
  const [leads, users, leadTimeRows] = await Promise.all([
    getLeads(200),
    getStaffUsers(),
    // Lấy TOÀN BỘ lead (chỉ 2 cột) để thống kê theo tuần/tháng chính xác, không bị giới hạn
    prisma.lead.findMany({ select: { status: true, createdAt: true } }),
  ]);

  /** Tổng hợp số lượng khách của 1 kỳ (tuần/tháng) */
  function periodStat(gran: Gran, i: number) {
    const { start, end } = windowFor(gran, i);
    const endExclusive = new Date(end);
    const inWin = leadTimeRows.filter((l) => {
      const t = new Date(l.createdAt);
      return t >= start && t < endExclusive;
    });
    const byStatus: Record<string, number> = {};
    for (const s of LEAD_STATUSES) byStatus[s] = 0;
    for (const l of inWin) byStatus[l.status] = (byStatus[l.status] || 0) + 1;
    // Tuần: lấy ngày giữa cửa sổ để đánh số tuần ổn định; Tháng: mốc ngày 1
    const anchor = gran === "week" ? new Date(start.getTime() + 3 * 86400000) : start;
    const key = periodKey(anchor, gran);
    const lastDay = new Date(end);
    lastDay.setDate(lastDay.getDate() - 1);
    return {
      key,
      label: periodLabel(key, gran),
      range: `${fmtD(start)} – ${fmtD(lastDay)}`,
      total: inWin.length,
      byStatus,
    };
  }

  // 8 tuần gần nhất + 6 tháng gần nhất (cũ → mới), kỳ rỗng vẫn hiện 0 để báo cáo dễ
  const weekly = [7, 6, 5, 4, 3, 2, 1, 0].map((i) => periodStat("week", i));
  const monthly = [5, 4, 3, 2, 1, 0].map((i) => periodStat("month", i));

  const monthSet = new Set(leads.map((l: any) => monthKey(l.createdAt)));
  const months = Array.from(monthSet)
    .sort((a, b) => {
      const [ay, am] = a.split("-").map(Number);
      const [by, bm] = b.split("-").map(Number);
      return by - ay || bm - am;
    })
    .map((key) => ({ key, label: monthLabel(key) }));

  // ===== Thống kê khách hàng =====
  const total = leads.length;
  const contacted = leads.filter((l: any) => l.contacted === "Đã liên hệ").length;
  const withPhone = leads.filter((l: any) => l.phone && String(l.phone).trim()).length;
  const fromZalo = leads.filter((l: any) => l.source === "Zalo").length;
  const fromFacebook = leads.filter((l: any) => l.source === "Facebook").length;

  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  const stats = [
    { icon: Users, label: "Tổng khách hàng", value: total, pctLabel: null as string | null, accent: "text-[#1b98e0]", glow: "bg-[#1b98e0]/10" },
    { icon: UserPlus, label: "Tổng khách đã liên hệ", value: contacted, pctLabel: `${pct(contacted)}%`, accent: "text-violet-400", glow: "bg-violet-400/10" },
    { icon: Phone, label: "Đã để lại SĐT", value: withPhone, pctLabel: `${pct(withPhone)}%`, accent: "text-emerald-400", glow: "bg-emerald-400/10" },
    { icon: MessageCircle, label: "Khách từ Zalo", value: fromZalo, pctLabel: `${pct(fromZalo)}%`, accent: "text-sky-400", glow: "bg-sky-400/10" },
    { icon: Facebook, label: "Khách từ Facebook", value: fromFacebook, pctLabel: `${pct(fromFacebook)}%`, accent: "text-blue-400", glow: "bg-blue-400/10" },
  ];

  return (
    <PageShell
      title="Khách hàng tiềm năng"
      subtitle="Quản lý khách hàng tiềm năng từ content và social"
    >
      {/* Thống kê khách hàng: số lượng + tỷ lệ % */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4 mb-5">
        {stats.map((s) => (
          <div key={s.label} className="card relative overflow-hidden p-4 animate-in">
            <div className={`absolute -right-4 -top-4 h-14 w-14 rounded-full ${s.glow} blur-xl`} />
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl ${s.glow} grid place-items-center ${s.accent} shrink-0`}>
                <s.icon size={17} />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold truncate">{s.label}</div>
                <div className={`text-xl sm:text-2xl font-black mt-0.5 ${s.accent}`}>{s.value}</div>
              </div>
            </div>
            {s.pctLabel && (
              <div className="mt-2.5 pt-2 border-t border-[var(--border-soft)] flex items-center gap-1.5 text-[10px] text-slate-400">
                <span className={`h-1.5 w-1.5 rounded-full ${s.glow}`} />
                <span>Tỷ lệ: <b className={s.accent}>{s.pctLabel}</b> của tổng</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Số lượng khách theo tuần / theo tháng — dùng để lấy số làm báo cáo */}
      <LeadsTimeStats weekly={weekly} monthly={monthly} />

      <div className="flex gap-3 mb-4">
        <CreateLeadModal users={users.map((u) => ({ id: u.id, name: u.name }))} />
        <ExportLeadsButton months={months} />
      </div>
      <Suspense fallback={null}>
        <LeadsTable leads={leads as any} users={users.map((u) => ({ id: u.id, name: u.name }))} />
      </Suspense>
    </PageShell>
  );
}
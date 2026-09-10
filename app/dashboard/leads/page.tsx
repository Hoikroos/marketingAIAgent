import { requirePerm } from "@/lib/guard";
import PageShell from "@/components/page-shell";
import CreateLeadModal from "@/components/CreateLeadModal";
import LeadsTable from "@/components/LeadsTable";
import ExportLeadsButton from "@/components/ExportLeadsButton";
import { Suspense } from "react";
import { Users, UserPlus, Phone, MessageCircle, Facebook } from "@/components/icons";
import { getLeads, getStaffUsers } from "@/components/db";

function monthKey(d: Date | string) {
  const date = new Date(d);
  return `${date.getFullYear()}-${date.getMonth() + 1}`;
}
function monthLabel(key: string) {
  const [y, m] = key.split("-");
  return `Tháng ${m}/${y}`;
}

export default async function Leads() {
  await requirePerm("leads");
  const [leads, users] = await Promise.all([getLeads(200), getStaffUsers()]);

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
"use client";
import { useCallback, useEffect, useState } from "react";
import { useToast } from "./toast";
import { Spinner, EmptyState } from "./ui";
import { Sparkles, Download, ChevronLeft, ChevronRight, CalendarDays, FileText } from "./icons";

type EmpWeekPublic = {
  dailyCount: number;
  filesCount: number;
  fileTitles: string[];
  contents: number;
  contentViews: number;
  contentLeads: number;
  leads: number;
  leadsWon: number;
  tasksDone: number;
  socialViews: number;
  socialVideos: number;
  summary: string;
};
type EmpPublic = {
  userId: number;
  name: string;
  jobTitle: string;
  totals: {
    files: number; daily: number; contents: number; contentViews: number; contentLeads: number;
    leads: number; leadsWon: number; tasksDone: number; socialViews: number; socialVideos: number;
  };
  overall: string;
  weeks: Record<string, EmpWeekPublic>;
};
type WeekPublic = {
  key: string;
  label: string;
  range: string;
  team: {
    files: number; daily: number; contents: number; contentViews: number; contentLeads: number;
    leads: number; leadsWon: number; tasksDone: number; socialViews: number; socialVideos: number;
  };
};
type GeneralData = {
  ok: boolean;
  year: number;
  month: number;
  label: string;
  weeks: WeekPublic[];
  teamTotals: Record<string, number>;
  aiUsed: boolean;
  overall: string;
  employees: EmpPublic[];
  cacheInfo: { provider: string; model: string; generatedAt: string; generatedBy: string } | null;
};

const fmt = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n));

/** Dòng mô tả số liệu của 1 kỳ (nhân viên hoặc nhóm) */
function numsLine(x: Record<string, number>, withDaily = true) {
  const parts: string[] = [];
  if (x.files) parts.push(`${x.files} báo cáo nộp`);
  if (withDaily && x.daily) parts.push(`${x.daily} nhật ký`);
  if (x.contents) parts.push(`${x.contents} nội dung (${x.contentViews} views, ${x.contentLeads} lead)`);
  if (x.leads) parts.push(`${x.leads} khách mới (${x.leadsWon} chốt)`);
  if (x.tasksDone) parts.push(`${x.tasksDone} việc hoàn thành`);
  if (x.socialViews || x.socialVideos) parts.push(`MXH ${x.socialViews} views / ${x.socialVideos} video`);
  return parts.length ? parts.join(" · ") : "Không ghi nhận hoạt động";
}

export default function GeneralReportPanel({ canManage, currentUserId }: { canManage: boolean; currentUserId?: number }) {
  const toast = useToast();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<GeneralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busySynth, setBusySynth] = useState(false);
  const [busyWord, setBusyWord] = useState(false);
  const [view, setView] = useState<"all" | string>("all");

  const load = useCallback(async (y: number, m: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/work-reports/general?year=${y}&month=${m}`);
      const d = await res.json();
      if (d.ok) setData(d);
    } catch {}
    finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load(year, month);
  }, [year, month, load]);

  function shiftMonth(dir: 1 | -1) {
    let y = year;
    let m = month + dir;
    if (m < 1) {
      m = 12;
      y--;
    }
    if (m > 12) {
      m = 1;
      y++;
    }
    setYear(y);
    setMonth(m);
  }

  /** Chạy AI tổng hợp lại báo cáo chung của tháng đang xem */
  async function synthesize() {
    setBusySynth(true);
    try {
      const res = await fetch("/api/work-reports/general", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, month, mode: "synthesize" }),
      });
      const d = await res.json();
      if (!res.ok || !d.ok) throw new Error(d.error || "Tổng hợp thất bại");
      toast.success("Đã tổng hợp bằng AI", d.aiUsed ? `${d.cacheInfo?.provider || ""} · ${d.cacheInfo?.model || ""}` : "Dùng mẫu tự động (chưa cấu hình AI)");
      await load(year, month);
    } catch (err: any) {
      toast.error("Tổng hợp thất bại", err.message || String(err));
    } finally {
      setBusySynth(false);
    }
  }

  /** Tạo và tải file Word "Báo cáo chung tháng" */
  async function downloadWord() {
    setBusyWord(true);
    try {
      const res = await fetch("/api/work-reports/general", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, month, mode: "word" }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `Lỗi ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bao-cao-chung-thang-${String(month).padStart(2, "0")}-${year}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Đã tải file Word", "Mở bằng Microsoft Word để xem Báo cáo chung.");
      await load(year, month); // cache AI mới cũng được cập nhật sau khi tổng hợp
    } catch (err: any) {
      toast.error("Tạo file Word thất bại", err.message || String(err));
    } finally {
      setBusyWord(false);
    }
  }

  const weeks = data?.weeks ?? [];
  const activeWeek = view !== "all" ? weeks.find((w) => w.key === view) : undefined;
  const tabCls = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-xs font-medium transition ${active ? "bg-[#1b98e0] text-white" : "bg-[var(--panel2)] text-slate-300 hover:bg-[var(--panel2)]/70"}`;

  return (
    <div className="card p-5 mb-5 animate-in">
      {/* Tiêu đề + điều hướng tháng */}
      <div className="flex flex-wrap items-center gap-2">
        <Sparkles size={15} className="text-violet-400" />
        <div className="font-extrabold text-sm tracking-tight">BÁO CÁO CHUNG {data?.label ? data.label.toUpperCase() : ""}</div>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => shiftMonth(-1)} className="btn-ghost h-8 w-8 !p-0 grid place-items-center rounded-lg" type="button" title="Tháng trước">
            <ChevronLeft size={15} />
          </button>
          <span className="text-xs font-bold px-1.5 whitespace-nowrap">Tháng {month}/{year}</span>
          <button onClick={() => shiftMonth(1)} className="btn-ghost h-8 w-8 !p-0 grid place-items-center rounded-lg" type="button" title="Tháng sau">
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
      <div className="text-[11px] text-slate-400 mt-1 mb-3">
        {data?.aiUsed
          ? `AI đã tổng hợp${data.cacheInfo ? ` · ${data.cacheInfo.provider}${data.cacheInfo.generatedAt ? ` · lúc ${new Date(data.cacheInfo.generatedAt).toLocaleString("vi-VN")}` : ""}${data.cacheInfo.generatedBy ? ` · bởi ${data.cacheInfo.generatedBy}` : ""}` : ""}`
          : 'Chưa tổng hợp bằng AI — bấm "Tổng hợp bằng AI" để có nhận xét chi tiết cho từng nhân viên.'}
      </div>

      {/* Nút hành động (chỉ quản lý) */}
      {canManage && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <button onClick={synthesize} disabled={busySynth} className="btn-ghost text-xs rounded-xl" type="button" title="AI đọc báo cáo tuần + nhật ký của từng nhân viên và viết nhận xét">
            {busySynth ? <Spinner size={13} /> : <Sparkles size={13} />} {busySynth ? "Đang tổng hợp AI..." : "Tổng hợp bằng AI"}
          </button>
          <button onClick={downloadWord} disabled={busyWord} className="btn-primary text-xs rounded-xl" type="button" title="Tổng hợp lại và tải file Word Báo cáo chung tháng">
            {busyWord ? <Spinner size={13} /> : <Download size={13} />} {busyWord ? "Đang tạo file..." : "Tải file Word (Báo cáo chung)"}
          </button>
        </div>
      )}

      {/* Tabs kỳ: cả tháng / từng tuần */}
      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        <button onClick={() => setView("all")} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${view === "all" ? "bg-[#1b98e0] text-white" : "bg-[var(--panel2)] text-slate-300 hover:bg-[var(--panel2)]/70"}`} type="button">
          Cả tháng
        </button>
        {weeks.map((w) => (
          <button key={w.key} onClick={() => setView(w.key)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${view === w.key ? "bg-[#1b98e0] text-white" : "bg-[var(--panel2)] text-slate-300 hover:bg-[var(--panel2)]/70"}`} type="button">
            {w.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-slate-400 py-6">
          <Spinner size={14} /> Đang tổng hợp dữ liệu báo cáo...
        </div>
      ) : !data || data.employees.length === 0 ? (
        <EmptyState
          title="Chưa có dữ liệu báo cáo"
          desc="Khi nhân viên nộp báo cáo tuần, viết nhật ký hoặc có hoạt động (nội dung, lead, công việc) trong tháng này, bản tổng hợp sẽ hiển thị ở đây."
        />
      ) : (
        <GeneralReportBody data={data} activeWeek={activeWeek} />
      )}
    </div>
  );
}

function GeneralReportBody({ data, activeWeek }: { data: GeneralData; activeWeek: WeekPublic | undefined }) {
  return activeWeek ? (
    <>
      {/* === XEM THEO TUẦN === */}
      <div className="p-3 bg-[var(--panel2)] rounded-xl mb-4">
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
          <CalendarDays size={12} className="text-[#1b98e0]" />
          <b>{activeWeek.label}</b>
          <span className="text-slate-500">({activeWeek.range})</span>
          <span className="ml-auto text-[11px] text-slate-400">{numsLine(activeWeek.team as any)}</span>
        </div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {data.employees.map((e) => {
          const x = e.weeks[activeWeek.key];
          if (!x) return null;
          return (
            <div key={e.userId} className="p-4 bg-[var(--panel2)] rounded-xl border border-[var(--border-soft)]">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="h-8 w-8 rounded-lg bg-violet-500/15 text-violet-300 grid place-items-center text-xs font-black shrink-0">
                  {e.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">{e.name}</div>
                  {e.jobTitle && <div className="text-[10px] text-slate-500 truncate">{e.jobTitle}</div>}
                </div>
                <span className="ml-auto text-[10px] text-slate-400 shrink-0">{numsLine(x as any, false)}</span>
              </div>
              <p className="text-[12px] leading-relaxed text-slate-300 whitespace-pre-line">{x.summary}</p>
              {x.fileTitles.length > 0 && (
                <div className="flex items-start gap-1.5 mt-2 text-[10px] text-slate-500">
                  <FileText size={11} className="mt-0.5 shrink-0" />
                  <span className="truncate">{x.fileTitles.join("; ")}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  ) : (
    <>
      {/* === XEM CẢ THÁNG === */}
      <div className="p-4 bg-[var(--panel2)] rounded-xl mb-4">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Tổng quan cả phòng</div>
        <p className="text-[12.5px] leading-relaxed text-slate-200 whitespace-pre-line">{data.overall}</p>
        <div className="text-[11px] text-slate-400 mt-2">{numsLine(data.teamTotals as any)}</div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {data.employees.map((e) => (
          <div key={e.userId} className="p-4 bg-[var(--panel2)] rounded-xl border border-[var(--border-soft)]">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="h-8 w-8 rounded-lg bg-violet-500/15 text-violet-300 grid place-items-center text-xs font-black shrink-0">
                {e.name.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold truncate">{e.name}</div>
                {e.jobTitle && <div className="text-[10px] text-slate-500 truncate">{e.jobTitle}</div>}
              </div>
              <span className="ml-auto text-[10px] text-slate-500 shrink-0">{numsLine(e.totals as any)}</span>
            </div>
            <p className="text-[12px] leading-relaxed text-slate-300 whitespace-pre-line">{e.overall}</p>
          </div>
        ))}
      </div>
    </>
  );
}
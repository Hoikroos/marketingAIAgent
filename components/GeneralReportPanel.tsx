"use client";
import { useCallback, useEffect, useState } from "react";
import { useToast } from "./toast";
import { Spinner, EmptyState } from "./ui";
import { Sparkles, Download, ChevronLeft, ChevronRight, CalendarDays, FileText } from "./icons";
import { splitSentences } from "@/lib/textLines";

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

/** Số liệu của 1 kỳ (nhân viên hoặc nhóm) → TỪNG chỉ số 1 dòng cho dễ đọc */
function statsItems(x: Record<string, number>, withDaily = true): string[] {
  const parts: string[] = [];
  if (x.files) parts.push(`${x.files} báo cáo nộp`);
  if (withDaily && x.daily) parts.push(`${x.daily} nhật ký ngày`);
  if (x.contents) parts.push(`${x.contents} nội dung (${x.contentViews} views, ${x.contentLeads} lead)`);
  if (x.leads) parts.push(`${x.leads} khách mới (${x.leadsWon} chốt)`);
  if (x.tasksDone) parts.push(`${x.tasksDone} việc hoàn thành`);
  if (x.socialViews || x.socialVideos) parts.push(`MXH ${x.socialViews} views / ${x.socialVideos} video`);
  return parts;
}

/** Danh sách số liệu — mỗi chỉ số XUỐNG 1 HÀNG riêng (không dồn vào 1 hàng dài) */
function StatLines({ items, empty = "Không ghi nhận hoạt động", className = "" }: { items: string[]; empty?: string; className?: string }) {
  if (!items.length) return <div className={`text-[11px] text-slate-500 ${className}`}>{empty}</div>;
  return (
    <ul className={`space-y-1 ${className}`}>
      {items.map((t, i) => (
        <li key={i} className="flex items-start gap-1.5 text-[11px] leading-snug">
          <span className="mt-[6px] h-1 w-1 rounded-full bg-slate-500 shrink-0" />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

/** Nội dung tổng hợp (AI/mẫu tự động) — mỗi câu XUỐNG 1 DÒNG riêng */
function TextLines({ text, className = "", size = "text-[12px]" }: { text: string; className?: string; size?: string }) {
  const lines = splitSentences(text);
  if (!lines.length) return null;
  return (
    <div className={`space-y-1.5 ${className}`}>
      {lines.map((l, i) => (
        <p key={i} className={`${size} leading-relaxed`}>{l}</p>
      ))}
    </div>
  );
}

/** Nhãn nhỏ cho từng nhóm nội dung trong thẻ nhân viên */
function GroupLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">{children}</div>;
}

export default function GeneralReportPanel({ canSynthesize, canExportWord }: { canSynthesize: boolean; canExportWord: boolean }) {
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
          : canSynthesize
            ? 'Chưa tổng hợp bằng AI — bấm "Tổng hợp bằng AI" để có nhận xét chi tiết cho từng nhân viên.'
            : "Chưa có bản tổng hợp AI cho tháng này — nội dung bên dưới là mẫu tổng hợp tự động từ số liệu hệ thống."}
      </div>

      {/* Nút hành động — MỖI NÚT 1 QUYỀN RIÊNG (xem lib/permissions.ts) */}
      {canSynthesize || canExportWord ? (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {canSynthesize ? (
            <button
              onClick={synthesize}
              disabled={busySynth}
              className="btn-ghost text-xs rounded-xl"
              type="button"
              title='AI đọc báo cáo tuần + nhật ký của từng nhân viên và viết nhận xét (quyền "Tổng hợp Báo cáo chung (AI)")'
            >
              {busySynth ? <Spinner size={13} /> : <Sparkles size={13} />} {busySynth ? "Đang tổng hợp AI..." : "Tổng hợp bằng AI"}
            </button>
          ) : (
            <span className="text-[11px] text-slate-500">
              Bạn không có quyền tổng hợp bằng AI — nội dung đang xem là bản tổng hợp gần nhất (hoặc mẫu tự động).
            </span>
          )}
          {canExportWord && (
            <button
              onClick={downloadWord}
              disabled={busyWord}
              className="btn-primary text-xs rounded-xl"
              type="button"
              title='Tải file Word Báo cáo chung tháng (quyền "Tải Báo cáo chung (file Word)")'
            >
              {busyWord ? <Spinner size={13} /> : <Download size={13} />} {busyWord ? "Đang tạo file..." : "Tải file Word (Báo cáo chung)"}
            </button>
          )}
        </div>
      ) : (
        <div className="text-[11px] text-slate-500 mb-4">
          Bạn được xem báo cáo tổng hợp của phòng. Việc tổng hợp bằng AI và tải file Word do Admin/quản lý (hoặc người được cấp quyền) thực hiện.
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
        </div>
        <div className="mt-2.5">
          <GroupLabel>Số liệu cả phòng trong tuần</GroupLabel>
          <StatLines items={statsItems(activeWeek.team as any)} className="text-slate-300" />
        </div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {data.employees.map((e) => {
          const x = e.weeks[activeWeek.key];
          if (!x) return null;
          return (
            <div key={e.userId} className="p-4 bg-[var(--panel2)] rounded-xl border border-[var(--border-soft)]">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-violet-500/15 text-violet-300 grid place-items-center text-xs font-black shrink-0">
                  {e.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">{e.name}</div>
                  {e.jobTitle && <div className="text-[10px] text-slate-500 truncate">{e.jobTitle}</div>}
                </div>
              </div>

              <div className="mt-3">
                <GroupLabel>Nhận xét trong tuần</GroupLabel>
                <TextLines text={x.summary} className="text-slate-300" />
              </div>

              <div className="mt-3">
                <GroupLabel>Số liệu tuần</GroupLabel>
                <StatLines items={statsItems(x as any, false)} className="text-slate-400" />
              </div>

              {x.fileTitles.length > 0 && (
                <div className="mt-3">
                  <GroupLabel>Báo cáo đã nộp ({x.fileTitles.length})</GroupLabel>
                  <ul className="space-y-1">
                    {x.fileTitles.map((t, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-[10px] text-slate-500 leading-snug">
                        <FileText size={11} className="mt-0.5 shrink-0" />
                        <span className="break-words">{t}</span>
                      </li>
                    ))}
                  </ul>
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
        <GroupLabel>Tổng quan cả phòng</GroupLabel>
        <TextLines text={data.overall} className="text-slate-200" size="text-[12.5px]" />
        <div className="mt-3 pt-3 border-t border-[var(--border-soft)]">
          <GroupLabel>Số liệu cả tháng</GroupLabel>
          <StatLines items={statsItems(data.teamTotals as any)} className="text-slate-400" />
        </div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {data.employees.map((e) => (
          <div key={e.userId} className="p-4 bg-[var(--panel2)] rounded-xl border border-[var(--border-soft)]">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-violet-500/15 text-violet-300 grid place-items-center text-xs font-black shrink-0">
                {e.name.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold truncate">{e.name}</div>
                {e.jobTitle && <div className="text-[10px] text-slate-500 truncate">{e.jobTitle}</div>}
              </div>
            </div>

            <div className="mt-3">
              <GroupLabel>Tổng quan tháng</GroupLabel>
              <TextLines text={e.overall} className="text-slate-300" />
            </div>

            <div className="mt-3">
              <GroupLabel>Số liệu tháng</GroupLabel>
              <StatLines items={statsItems(e.totals as any)} className="text-slate-400" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
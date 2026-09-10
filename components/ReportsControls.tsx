"use client";
import { useMemo, useState } from "react";
import { useToast } from "./toast";
import { Download, CalendarDays, ChevronDown } from "./icons";
import { Spinner } from "./ui";
import dynamic from "next/dynamic";
import usePerm from "./usePerm";
// Lazy-load recharts để giảm bundle của trang báo cáo
const ReportChart = dynamic(() => import("./charts").then((m) => m.ReportChart), {
  ssr: false,
  loading: () => (
    <div className="h-56 grid place-items-center rounded-xl bg-[var(--panel)] text-xs text-slate-400 animate-pulse">Đang tải biểu đồ…</div>
  ),
});

type SeriesPoint = { d: string; views: number; eng: number; leads: number };

const RANGES = [
  { label: "7 ngày qua", n: 7 },
  { label: "30 ngày qua", n: 30 },
  { label: "90 ngày qua", n: 90 },
];

function toCsvValue(v: any) {
  const s = String(v ?? "");
  return `"${s.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map(toCsvValue).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ReportsControls({ series }: { series?: SeriesPoint[] }) {
  const canExport = usePerm("reports_export");
  const [rangeOpen, setRangeOpen] = useState(false);
  const [range, setRange] = useState(RANGES[0]);
  const [exporting, setExporting] = useState(false);
  const toast = useToast();

  const filteredSeries = useMemo(() => (series || []).slice(-range.n), [series, range]);

  async function exportReport() {
    setExporting(true);
    try {
      const [contentsRes, leadsRes] = await Promise.all([
        fetch("/api/contents"),
        fetch("/api/leads"),
      ]);
      const [contentsData, leadsData] = await Promise.all([
        contentsRes.json(),
        leadsRes.json(),
      ]);

      const rows: (string | number)[][] = [];
      rows.push(["BÁO CÁO MARKETING", new Date().toLocaleString("vi-VN")]);
      rows.push([]);
      rows.push(["-- CONTENT --"]);
      rows.push(["Tiêu đề", "Nền tảng", "Lượt xem", "Ngày tạo"]);
      for (const c of contentsData.contents || []) {
        rows.push([c.title, c.platform, c.views, new Date(c.createdAt).toLocaleDateString("vi-VN")]);
      }
      rows.push([]);
      rows.push(["-- LEADS --"]);
      rows.push(["Họ tên", "SĐT", "Nguồn", "Trạng thái", "Ngày tạo"]);
      for (const l of leadsData.leads || []) {
        rows.push([l.name, l.phone, l.source, l.status, new Date(l.createdAt).toLocaleDateString("vi-VN")]);
      }

      downloadCsv(`bao-cao-marketing-${Date.now()}.csv`, rows);
      toast.success("Đã xuất báo cáo", "File CSV đã được tải xuống.");
    } catch (err: any) {
      toast.error("Xuất báo cáo thất bại", err.message || String(err));
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <div className="flex justify-end gap-2 mb-4">
        <div className="relative">
          <button onClick={() => setRangeOpen((v) => !v)} className="btn-ghost text-xs" type="button">
            <CalendarDays size={14} /> {range.label} <ChevronDown size={13} />
          </button>
          {rangeOpen && (
            <div className="absolute right-0 mt-1 w-40 glass rounded-xl p-1.5 shadow-2xl z-20 animate-in">
              {RANGES.map((r) => (
                <button
                  key={r.label}
                  onClick={() => { setRange(r); setRangeOpen(false); }}
                  type="button"
                  className="w-full text-left px-2.5 py-2 rounded-lg text-xs hover:bg-[var(--panel2)]"
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button onClick={exportReport} disabled={exporting || !canExport} className={`text-xs ${canExport ? "btn-primary" : "btn-ghost"}`} type="button">
          {exporting ? <Spinner size={13} /> : <Download size={14} />}
          {exporting ? "Đang xuất..." : canExport ? "Xuất báo cáo" : "Không có quyền xuất"}
        </button>
      </div>
      <div className="card p-5">
        <div className="font-extrabold mb-4 text-sm tracking-tight">HIỆU SUẤT TỔNG QUAN</div>
        <ReportChart data={filteredSeries.map((s) => ({ d: s.d, views: s.views, eng: s.eng }))} />
      </div>
    </>
  );
}

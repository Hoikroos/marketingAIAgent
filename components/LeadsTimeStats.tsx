"use client";
import { useMemo, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { CalendarDays } from "./icons";

/** 1 kỳ (tuần/tháng) — tổng số khách mới + số lượng theo từng trạng thái */
export type PeriodStat = {
  key: string; // "2026-W38" hoặc "2026-09"
  label: string; // "Tuần 38/2026" hoặc "T9/2026"
  range: string; // "21/09 – 27/09"
  total: number;
  byStatus: Record<string, number>;
};

const STATUS_BARS = [
  { key: "Mới", fill: "#34d399" },
  { key: "Đang tư vấn", fill: "#fbbf24" },
  { key: "Đã chốt", fill: "#a78bfa" },
  { key: "Không tiềm năng", fill: "#fb7185" },
];

const tooltipStyle = {
  background: "var(--panel2)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
};

/** % thay đổi so với kỳ trước; ẩn khi không so được (cả hai = 0) */
function GrowthBadge({ cur, prev }: { cur: number; prev: number }) {
  if (prev === 0 && cur === 0) return null;
  const p = prev === 0 ? (cur > 0 ? 100 : null) : ((cur - prev) / prev) * 100;
  if (p === null) return null;
  const up = p >= 0;
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${up ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"}`}>
      {up ? "▲" : "▼"} {Math.abs(Math.round(p))}% so với kỳ trước
    </span>
  );
}

/** Ô "so với kỳ trước" trong bảng (cùng quy ước workStats.growth) */
function DeltaCell({ cur, prev }: { cur: number; prev: number }) {
  if (prev === 0 && cur === 0) return <span className="text-slate-500">—</span>;
  const p = prev === 0 ? (cur > 0 ? 100 : null) : ((cur - prev) / prev) * 100;
  if (p === null) return <span className="text-slate-500">—</span>;
  const up = p >= 0;
  return (
    <span className={`font-bold ${up ? "text-emerald-400" : "text-rose-400"}`}>
      {up ? "▲" : "▼"} {Math.abs(Math.round(p))}%
    </span>
  );
}

/** Nhãn ngắn trên trục X: "T35/26" (tuần) / "T9/26" (tháng) */
function shortLabel(s: PeriodStat) {
  if (s.key.includes("-W")) {
    const [y, w] = s.key.split("-W");
    return `T${Number(w)}/${y.slice(2)}`;
  }
  const [y, m] = s.key.split("-");
  return `T${Number(m)}/${y.slice(2)}`;
}

export default function LeadsTimeStats({ weekly, monthly }: { weekly: PeriodStat[]; monthly: PeriodStat[] }) {
  const [gran, setGran] = useState<"week" | "month">("week");
  const series = gran === "week" ? weekly : monthly;

  // Dữ liệu biểu đồ: cột xếp lớp theo trạng thái khách
  const chartData = useMemo(
    () =>
      series.map((s) => {
        const row: Record<string, string | number> = { short: shortLabel(s), name: s.label, range: s.range, total: s.total };
        for (const b of STATUS_BARS) row[b.key] = s.byStatus[b.key] ?? 0;
        return row;
      }),
    [series]
  );

  const cur = series[series.length - 1];
  const prev = series[series.length - 2];
  const tabCls = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-xs font-medium transition ${active ? "bg-[#1b98e0] text-white" : "bg-[var(--panel2)] text-slate-300 hover:bg-[var(--panel2)]/70"}`;

  return (
    <div className="card p-5 mb-5 animate-in">
      {/* Tiêu đề + chuyển Tuần / Tháng */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <CalendarDays size={15} className="text-[#1b98e0]" />
        <div className="font-extrabold text-sm tracking-tight">
          SỐ LƯỢNG KHÁCH {gran === "week" ? "THEO TUẦN" : "THEO THÁNG"}
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <button onClick={() => setGran("week")} className={tabCls(gran === "week")} type="button">
            Theo tuần
          </button>
          <button onClick={() => setGran("month")} className={tabCls(gran === "month")} type="button">
            Theo tháng
          </button>
        </div>
      </div>

      {/* KPI kỳ hiện tại + kỳ trước */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div className="p-3.5 bg-[var(--panel2)] rounded-xl">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-slate-400">
              {cur?.label ?? "—"} <span className="text-slate-500">({cur?.range ?? ""})</span>
            </div>
            <GrowthBadge cur={cur?.total ?? 0} prev={prev?.total ?? 0} />
          </div>
          <div className="text-2xl font-black mt-1 text-[#1b98e0]">{cur?.total ?? 0} khách</div>
          <div className="text-[11px] text-slate-500 mt-1">
            Mới {cur?.byStatus?.["Mới"] ?? 0} · Đang tư vấn {cur?.byStatus?.["Đang tư vấn"] ?? 0} · Đã chốt{" "}
            {cur?.byStatus?.["Đã chốt"] ?? 0} · Không tiềm năng {cur?.byStatus?.["Không tiềm năng"] ?? 0}
          </div>
        </div>
        <div className="p-3.5 bg-[var(--panel2)] rounded-xl">
          <div className="text-xs text-slate-400">
            {prev?.label ?? "Kỳ trước"} <span className="text-slate-500">({prev?.range ?? "—"})</span>
          </div>
          <div className="text-2xl font-black mt-1 text-slate-300">{prev?.total ?? 0} khách</div>
          <div className="text-[11px] text-slate-500 mt-1">Số liệu kỳ trước để so sánh khi báo cáo</div>
        </div>
      </div>

      {/* Biểu đồ cột xếp lớp theo trạng thái */}
      <div className="text-[11px] text-slate-500 mb-1">
        Cột xếp lớp theo trạng thái khách — cột càng cao = kỳ đó về càng nhiều khách.
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData}>
          <CartesianGrid stroke="var(--border-soft)" strokeDasharray="3 3" />
          <XAxis dataKey="short" stroke="#71839a" fontSize={11} />
          <YAxis stroke="#71839a" fontSize={11} allowDecimals={false} />
          <Tooltip
            contentStyle={tooltipStyle}
            labelFormatter={(_label: any, payload: any) => {
              const row = payload?.[0]?.payload;
              return row ? `${row.name}${row.range ? ` (${row.range})` : ""}` : "";
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {STATUS_BARS.map((b, i) => (
            <Bar
              key={b.key}
              dataKey={b.key}
              name={b.key}
              stackId="leads"
              fill={b.fill}
              radius={i === STATUS_BARS.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
              maxBarSize={40}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>

      {/* Bảng chi tiết từng kỳ — lấy số làm báo cáo */}
      <div className="overflow-x-auto mt-4">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-400 text-left border-b border-[var(--border-soft)]">
              <th className="py-2 pr-3 font-medium">Kỳ</th>
              <th className="py-2 pr-3 font-medium">Khoảng</th>
              <th className="py-2 pr-3 font-medium text-right">Tổng</th>
              {STATUS_BARS.map((b) => (
                <th key={b.key} className="py-2 pr-3 font-medium text-right">
                  {b.key}
                </th>
              ))}
              <th className="py-2 font-medium text-right">vs kỳ trước</th>
            </tr>
          </thead>
          <tbody>
            {series.map((s, i) => {
              const prevRow = series[i - 1];
              return (
                <tr key={s.key} className="border-b border-[var(--border-soft)] last:border-b-0">
                  <td className="py-2 pr-3 font-bold whitespace-nowrap">{s.label}</td>
                  <td className="py-2 pr-3 text-slate-400 whitespace-nowrap">{s.range}</td>
                  <td className="py-2 pr-3 text-right font-black text-[#1b98e0]">{s.total}</td>
                  {STATUS_BARS.map((b) => (
                    <td key={b.key} className="py-2 pr-3 text-right text-slate-300">
                      {s.byStatus?.[b.key] ?? 0}
                    </td>
                  ))}
                  <td className="py-2 text-right">
                    {prevRow ? <DeltaCell cur={s.total} prev={prevRow.total} /> : <span className="text-slate-500">—</span>}
                  </td>
                </tr>
              );
            })}
            {series.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-slate-500">
                  Chưa có số liệu.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-slate-500 mt-2">
        Tuần tính từ thứ Hai đến chủ Nhật (cùng cách đánh số tuần với Báo cáo công việc &amp; Thống kê công việc). Số liệu lấy
        từ toàn bộ khách hàng trong hệ thống, không giới hạn 200 dòng như bảng bên dưới.
      </p>
    </div>
  );
}
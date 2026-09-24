"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, CalendarDays, Share2, TrendingDown, TrendingUp, Video } from "./icons";
import type { SocialChannelRow, SocialPeriodStat } from "@/lib/socialStats";

const tooltipStyle = {
  background: "var(--panel2)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
};

/** Các chỉ số xem được trên biểu đồ */
const METRICS = [
  { key: "followers", label: "Lượt follow", color: "#1b98e0" },
  { key: "videos", label: "Video đã đăng", color: "#a78bfa" },
  { key: "avgViews", label: "View TB/video", color: "#34d399" },
  { key: "views", label: "Tổng view", color: "#38bdf8" },
  { key: "engagement", label: "Tương tác", color: "#fbbf24" },
] as const;
type MetricKey = (typeof METRICS)[number]["key"];

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}
const fmtFull = (n: number) => n.toLocaleString("vi-VN");

/** % thay đổi so với kỳ trước; null khi cả 2 kỳ đều = 0 */
function growthPct(cur: number, prev: number): number | null {
  if (prev === 0 && cur === 0) return null;
  if (prev === 0) return 100;
  return ((cur - prev) / prev) * 100;
}

/** Nhãn ngắn trên trục X: "T38/26" */
function shortLabel(key: string): string {
  if (key.includes("-W")) {
    const [y, w] = key.split("-W");
    return `T${Number(w)}/${y.slice(2)}`;
  }
  const [y, m] = key.split("-");
  return `T${Number(m)}/${y.slice(2)}`;
}

/** Ô "so với kỳ trước" trong bảng */
function Delta({ cur, prev, prevLabel }: { cur: number; prev: number; prevLabel?: string }) {
  const p = growthPct(cur, prev);
  if (p === null) return <span className="text-slate-500">—</span>;
  const up = p >= 0;
  return (
    <span className={`font-bold ${up ? "text-emerald-400" : "text-rose-400"}`} title={prevLabel ? `So với ${prevLabel}` : undefined}>
      {up ? "▲" : "▼"} {Math.abs(Math.round(p))}%
    </span>
  );
}

/** Thẻ KPI lớn phía trên: giá trị kỳ mới nhất + so sánh kỳ trước */
function KpiCard({
  icon: Icon,
  label,
  value,
  text,
  sub,
  prev,
  prevLabel,
  accent,
  glow,
}: {
  icon: any;
  label: string;
  value: number;
  text?: string;
  sub?: string;
  prev?: number;
  prevLabel?: string;
  accent: string;
  glow: string;
}) {
  const p = prev === undefined ? null : growthPct(value, prev);
  const up = (p ?? 0) >= 0;
  return (
    <div className="relative overflow-hidden rounded-xl bg-[var(--panel2)] p-3.5">
      <div className={`absolute -right-4 -top-4 h-14 w-14 rounded-full ${glow} blur-xl`} />
      <div className="flex items-center gap-2">
        <div className={`h-7 w-7 rounded-lg ${glow} grid place-items-center ${accent} shrink-0`}>
          <Icon size={14} />
        </div>
        <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">{label}</div>
      </div>
      <div className={`text-xl font-black mt-2 ${accent}`}>{text ?? fmtNum(value)}</div>
      {p !== null && (
        <div className={`flex items-center gap-1 text-[10px] mt-1 ${up ? "text-emerald-400" : "text-rose-400"}`}>
          {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {Math.abs(Math.round(p))}% so với {prevLabel || "kỳ trước"}
        </div>
      )}
      {sub && <div className="text-[10px] text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}

export default function SocialReportPanel({
  weekly,
  monthly,
  channels,
}: {
  weekly: SocialPeriodStat[];
  monthly: SocialPeriodStat[];
  channels: SocialChannelRow[];
}) {
  const [gran, setGran] = useState<"week" | "month">("week");
  const [metric, setMetric] = useState<MetricKey>("followers");

  const series = gran === "week" ? weekly : monthly;
  const cur = series[series.length - 1];
  const prev = series[series.length - 2];
  const curLabel = cur?.label || (gran === "week" ? "tuần này" : "tháng này");
  const prevLabel = prev?.label;
  const hasData = series.some((s) => s.channels > 0);
  const metricDef = METRICS.find((m) => m.key === metric) || METRICS[0];

  const chartData = useMemo(
    () => series.map((s) => ({ short: shortLabel(s.key), name: s.label, range: s.range, value: s[metric] })),
    [series, metric]
  );

  const tabCls = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-xs font-medium transition ${active ? "bg-[#1b98e0] text-white" : "bg-[var(--panel2)] text-slate-300 hover:bg-[var(--panel2)]/70"}`;
  const chipCls = (active: boolean) =>
    `px-2.5 py-1 rounded-full text-[11px] font-semibold transition ${active ? "bg-[#1b98e0] text-white" : "bg-[var(--panel2)] text-slate-300 hover:text-white"}`;

  return (
    <div className="card p-5 mb-5 animate-in">
      {/* Tiêu đề + chuyển Tuần / Tháng */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Share2 size={15} className="text-[#1b98e0]" />
        <div className="font-extrabold text-sm tracking-tight">
          BÁO CÁO MẠNG XÃ HỘI THEO {gran === "week" ? "TUẦN" : "THÁNG"}
        </div>
        <div className="flex gap-2 ml-auto">
          <button onClick={() => setGran("week")} className={tabCls(gran === "week")}>
            Theo tuần
          </button>
          <button onClick={() => setGran("month")} className={tabCls(gran === "month")}>
            Theo tháng
          </button>
          <Link href="/dashboard/social" className="text-[11px] text-[#1b98e0] hover:underline self-center ml-1">
            Nhập số liệu →
          </Link>
        </div>
      </div>

      {!hasData ? (
        <div className="h-40 grid place-items-center text-xs text-slate-400 rounded-xl bg-[var(--panel2)]">
          Chưa có số liệu MXH — nhập ở trang{" "}
          <Link href="/dashboard/social" className="text-[#1b98e0] mx-1">
            Mạng xã hội
          </Link>
          để xem báo cáo follow / video / view.
        </div>
      ) : (
        <>
          {/* KPI kỳ mới nhất */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
            <KpiCard
              icon={Share2}
              label="Lượt follow"
              value={cur?.followers || 0}
              text={fmtFull(cur?.followers || 0)}
              prev={prev?.followers}
              prevLabel={prevLabel}
              sub={`${cur?.channels || 0} kênh có số liệu ${curLabel}`}
              accent="text-[#1b98e0]"
              glow="bg-[#1b98e0]/10"
            />
            <KpiCard
              icon={Video}
              label="Video đã đăng"
              value={cur?.videos || 0}
              prev={prev?.videos}
              prevLabel={prevLabel}
              sub={`${fmtFull(cur?.videos || 0)} video trong ${curLabel}`}
              accent="text-violet-400"
              glow="bg-violet-400/10"
            />
            <KpiCard
              icon={BarChart3}
              label="View TB / video"
              value={cur?.avgViews || 0}
              prev={prev?.avgViews}
              prevLabel={prevLabel}
              sub={`Tổng ${fmtNum(cur?.views || 0)} view trong kỳ`}
              accent="text-emerald-400"
              glow="bg-emerald-400/10"
            />
            <KpiCard
              icon={CalendarDays}
              label="Tổng view"
              value={cur?.views || 0}
              prev={prev?.views}
              prevLabel={prevLabel}
              sub={`${fmtFull(cur?.engagement || 0)} tương tác trong kỳ`}
              accent="text-sky-400"
              glow="bg-sky-400/10"
            />
          </div>

          {/* Biểu đồ theo chỉ số đang chọn */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-[11px] text-slate-400">Chỉ số:</span>
            {METRICS.map((m) => (
              <button key={m.key} onClick={() => setMetric(m.key)} className={chipCls(metric === m.key)}>
                {m.label}
              </button>
            ))}
          </div>
          <div className="text-[11px] text-slate-500 mb-1">
            {metricDef.label} của {gran === "week" ? "8 tuần" : "6 tháng"} gần nhất — cột càng cao = kỳ đó càng tốt.
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData}>
              <CartesianGrid stroke="var(--border-soft)" strokeDasharray="3 3" />
              <XAxis dataKey="short" stroke="#71839a" fontSize={11} />
              <YAxis stroke="#71839a" fontSize={11} allowDecimals={false} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: any) => [`${fmtFull(Number(v))} ${metric === "videos" ? "video" : metric === "avgViews" ? "view/video" : metric === "followers" ? "follow" : "view"}`, metricDef.label]}
                labelFormatter={(_l: any, payload: any) => {
                  const row = payload?.[0]?.payload;
                  return row ? `${row.name}${row.range ? ` (${row.range})` : ""}` : "";
                }}
              />
              <Bar dataKey="value" name={metricDef.label} fill={metricDef.color} radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>

          {/* Bảng chi tiết từng kỳ — lấy số làm báo cáo */}
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400 text-left border-b border-[var(--border-soft)]">
                  <th className="py-2 pr-3 font-medium whitespace-nowrap">Kỳ</th>
                  <th className="py-2 pr-3 font-medium whitespace-nowrap">Khoảng</th>
                  <th className="py-2 pr-3 font-medium text-right">Lượt follow</th>
                  <th className="py-2 pr-3 font-medium text-right">Video đã đăng</th>
                  <th className="py-2 pr-3 font-medium text-right">View TB/video</th>
                  <th className="py-2 pr-3 font-medium text-right">Tổng view</th>
                  <th className="py-2 pr-3 font-medium text-right">Tương tác</th>
                  <th className="py-2 font-medium text-right whitespace-nowrap">vs kỳ trước ({metricDef.label})</th>
                </tr>
              </thead>
              <tbody>
                {series.map((s, i) => {
                  const prevRow = series[i - 1];
                  return (
                    <tr key={s.key} className="border-b border-[var(--border-soft)] last:border-b-0">
                      <td className="py-2 pr-3 font-bold whitespace-nowrap">{s.label}</td>
                      <td className="py-2 pr-3 text-slate-400 whitespace-nowrap">{s.range || "—"}</td>
                      <td className="py-2 pr-3 text-right font-black text-[#1b98e0]">{fmtFull(s.followers)}</td>
                      <td className="py-2 pr-3 text-right text-violet-300 font-bold">{fmtFull(s.videos)}</td>
                      <td className="py-2 pr-3 text-right text-emerald-300 font-bold">{fmtFull(s.avgViews)}</td>
                      <td className="py-2 pr-3 text-right text-sky-300">{fmtFull(s.views)}</td>
                      <td className="py-2 pr-3 text-right text-amber-300">{fmtFull(s.engagement)}</td>
                      <td className="py-2 text-right">
                        {prevRow ? <Delta cur={s[metric]} prev={prevRow[metric]} prevLabel={prevRow.label} /> : <span className="text-slate-500">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Số liệu mới nhất theo từng kênh */}
          {channels.length > 0 && (
            <div className="mt-5">
              <div className="font-extrabold text-xs tracking-tight mb-2 flex items-center gap-2">
                <Share2 size={13} className="text-[#1b98e0]" /> SỐ LIỆU MỚI NHẤT THEO KÊNH
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-400 text-left border-b border-[var(--border-soft)]">
                      <th className="py-2 pr-3 font-medium">Kênh</th>
                      <th className="py-2 pr-3 font-medium">Nền tảng</th>
                      <th className="py-2 pr-3 font-medium">Tuần</th>
                      <th className="py-2 pr-3 font-medium text-right">Lượt follow</th>
                      <th className="py-2 pr-3 font-medium text-right">Video đã đăng</th>
                      <th className="py-2 font-medium text-right">View TB/video</th>
                    </tr>
                  </thead>
                  <tbody>
                    {channels.map((c) => (
                      <tr key={`${c.platform}-${c.channel}`} className="border-b border-[var(--border-soft)] last:border-b-0">
                        <td className="py-2 pr-3 font-bold whitespace-nowrap">{c.channel}</td>
                        <td className="py-2 pr-3 text-slate-400 whitespace-nowrap">{c.platform}</td>
                        <td className="py-2 pr-3 text-slate-400 whitespace-nowrap">{c.weekLabel}</td>
                        <td className="py-2 pr-3 text-right font-black text-[#1b98e0]">{fmtFull(c.followers)}</td>
                        <td className="py-2 pr-3 text-right text-violet-300">{fmtFull(c.videos)}</td>
                        <td className="py-2 text-right text-emerald-300">{fmtFull(c.avgViews)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <p className="text-[10px] text-slate-500 mt-3">
            Lượt follow = ảnh chụp follow <b>mới nhất</b> của mỗi kênh trong kỳ (không cộng dồn qua các tuần). Video đã đăng,
            view và tương tác là số <b>phát sinh trong kỳ</b> (cộng theo tuần). View TB/video = tổng view ÷ số video đã đăng.
            Tháng gộp các tuần có ngày trong tháng (tuần ở ranh giới 2 tháng được tính cho cả 2 tháng) — giống trang Trạng
            thái mạng xã hội. Cách đánh số tuần trùng với Báo cáo công việc &amp; Thống kê công việc.
          </p>
        </>
      )}
    </div>
  );
}

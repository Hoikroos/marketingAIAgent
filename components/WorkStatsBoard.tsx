"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { TrendingUp, TrendingDown } from "./icons";
import {
  GRAN_LABEL,
  MODULE_LABEL,
  SERIES_LEN,
  growth,
  periodKey,
  periodLabel,
  recentKeys,
  type Gran,
} from "@/lib/workStats";

export type WorkStatsData = {
  logs: { module: string; action: string; createdAt: string }[];
  tasks: { assignee: string | null; status: string; createdAt: string }[];
  contents: { createdAt: string }[];
  leads: { status: string; createdAt: string }[];
  reports: { status: string; submittedAt: string | null }[];
  dailyReports: { createdAt: string }[];
  social: { createdAt: string }[];
  ads: { createdAt: string }[];
};

type Metrics = {
  activities: number; // tổng thao tác trên hệ thống (ActivityLog)
  tasksDone: number; // công việc "Đã hoàn thành"
  contentsPublished: number; // nội dung tạo mới trong kỳ
  leadsWon: number; // lead "Đã chốt"
  reportsSubmitted: number; // báo cáo công việc "Đã nộp"
  dailyReports: number; // nhật ký công việc
  socialEntries: number; // lần nhập số liệu MXH
  adsCreated: number; // chiến dịch ads tạo mới
};

const ZERO: Metrics = {
  activities: 0, tasksDone: 0, contentsPublished: 0, leadsWon: 0,
  reportsSubmitted: 0, dailyReports: 0, socialEntries: 0, adsCreated: 0,
};

function metricsTotal(m: Metrics): number {
  return m.activities + m.tasksDone + m.contentsPublished + m.leadsWon +
    m.reportsSubmitted + m.dailyReports + m.socialEntries + m.adsCreated;
}

const tooltipStyle = {
  background: "var(--panel2)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
};

function GrowthBadge({ cur, prev }: { cur: number; prev: number }) {
  const g = growth(cur, prev);
  if (g === null) return <span className="text-[11px] text-slate-500">—</span>;
  const up = g >= 0;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${up ? "text-emerald-400" : "text-rose-400"}`}>
      {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {up ? "+" : ""}{g.toFixed(0)}%
    </span>
  );
}

export default function WorkStatsBoard({ data }: { data: WorkStatsData }) {
  const [gran, setGran] = useState<Gran>("week");
  const [selectedKey, setSelectedKey] = useState<string | null>(null); // null = kỳ hiện tại

  const keys = useMemo(() => recentKeys(gran, SERIES_LEN[gran]), [gran]);
  const nowKey = useMemo(() => periodKey(new Date(), gran), [gran]);
  const activeKey = selectedKey && keys.includes(selectedKey) ? selectedKey : nowKey;
  const currentIdx = keys.indexOf(activeKey);
  const prevKey = currentIdx > 0 ? keys[currentIdx - 1] : null;

  /** Tổng hợp toàn bộ chỉ số theo key kỳ của từng nguồn dữ liệu */
  const byPeriod = useMemo(() => {
    const map = new Map<string, Metrics>();
    const bump = (k: string, field: keyof Metrics) => {
      if (!k) return;
      if (!map.has(k)) map.set(k, { ...ZERO });
      map.get(k)![field] += 1;
    };

    for (const l of data.logs) bump(periodKey(new Date(l.createdAt), gran), "activities");
    for (const t of data.tasks) {
      if (t.status === "Đã hoàn thành") bump(periodKey(new Date(t.createdAt), gran), "tasksDone");
    }
    for (const c of data.contents) bump(periodKey(new Date(c.createdAt), gran), "contentsPublished");
    for (const l of data.leads) {
      if (l.status === "Đã chốt") bump(periodKey(new Date(l.createdAt), gran), "leadsWon");
    }
    for (const r of data.reports) {
      if (r.status === "Đã nộp" && r.submittedAt) bump(periodKey(new Date(r.submittedAt), gran), "reportsSubmitted");
    }
    for (const d of data.dailyReports) bump(periodKey(new Date(d.createdAt), gran), "dailyReports");
    for (const s of data.social) bump(periodKey(new Date(s.createdAt), gran), "socialEntries");
    for (const a of data.ads) bump(periodKey(new Date(a.createdAt), gran), "adsCreated");

    return map;
  }, [data, gran]);

  /** Dữ liệu bảng so sánh + biểu đồ: N kỳ gần nhất (cũ → mới) */
  const series = useMemo(
    () =>
      keys.map((k, idx) => {
        const m = byPeriod.get(k) || { ...ZERO };
        const prev = idx > 0 ? byPeriod.get(keys[idx - 1]) || { ...ZERO } : { ...ZERO };
        return {
          key: k,
          label: periodLabel(k, gran),
          ...m,
          total: metricsTotal(m),
          prevTotal: metricsTotal(prev),
        };
      }),
    [keys, byPeriod, gran]
  );

  const curMetrics = byPeriod.get(activeKey) || { ...ZERO };
  const prevMetrics = (prevKey && byPeriod.get(prevKey)) || { ...ZERO };

  /** Phân rã theo CHỨC NĂNG (module): kỳ đang chọn vs kỳ trước */
  const moduleRows = useMemo(() => {
    const cur = new Map<string, number>();
    const prev = new Map<string, number>();
    for (const l of data.logs) {
      const k = periodKey(new Date(l.createdAt), gran);
      if (k === activeKey) cur.set(l.module, (cur.get(l.module) || 0) + 1);
      else if (prevKey && k === prevKey) prev.set(l.module, (prev.get(l.module) || 0) + 1);
    }
    const mods = Array.from(new Set([...cur.keys(), ...prev.keys()]));
    return mods
      .map((m) => ({
        module: m,
        label: MODULE_LABEL[m] || m,
        cur: cur.get(m) || 0,
        prev: prev.get(m) || 0,
      }))
      .sort((a, b) => b.cur - a.cur || b.prev - a.prev);
  }, [data.logs, gran, activeKey, prevKey]);

  /** Công việc hoàn thành THEO NGƯỜI (kỳ đang chọn vs kỳ trước) */
  const assigneeRows = useMemo(() => {
    const cur = new Map<string, number>();
    const prev = new Map<string, number>();
    for (const t of data.tasks) {
      if (t.status !== "Đã hoàn thành") continue;
      const k = periodKey(new Date(t.createdAt), gran);
      const who = (t.assignee || "").trim() || "Chưa giao";
      if (k === activeKey) cur.set(who, (cur.get(who) || 0) + 1);
      else if (prevKey && k === prevKey) prev.set(who, (prev.get(who) || 0) + 1);
    }
    const people = Array.from(new Set([...cur.keys(), ...prev.keys()]));
    return people
      .map((p) => ({ name: p, cur: cur.get(p) || 0, prev: prev.get(p) || 0 }))
      .sort((a, b) => b.cur - a.cur || b.prev - a.prev);
  }, [data.tasks, gran, activeKey, prevKey]);

  const kpiCards: { label: string; cur: number; prev: number }[] = [
    { label: "Công việc hoàn thành", cur: curMetrics.tasksDone, prev: prevMetrics.tasksDone },
    { label: "Nội dung tạo mới", cur: curMetrics.contentsPublished, prev: prevMetrics.contentsPublished },
    { label: "Lead đã chốt", cur: curMetrics.leadsWon, prev: prevMetrics.leadsWon },
    { label: "Báo cáo đã nộp", cur: curMetrics.reportsSubmitted, prev: prevMetrics.reportsSubmitted },
    { label: "Nhật ký công việc", cur: curMetrics.dailyReports, prev: prevMetrics.dailyReports },
    { label: "Lần nhập số liệu MXH", cur: curMetrics.socialEntries, prev: prevMetrics.socialEntries },
    { label: "Chiến dịch ads tạo mới", cur: curMetrics.adsCreated, prev: prevMetrics.adsCreated },
    { label: "Tổng thao tác hệ thống", cur: curMetrics.activities, prev: prevMetrics.activities },
  ];

  return (
    <div className="space-y-4">
      {/* Bộ chọn kỳ + kỳ đang xem */}
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          {(Object.keys(GRAN_LABEL) as Gran[]).map((g) => (
            <button
              key={g}
              onClick={() => { setGran(g); setSelectedKey(null); }}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition ${
                gran === g ? "bg-[#1b98e0] text-white" : "bg-[var(--panel2)] text-slate-400 hover:bg-[var(--panel2)]/80"
              }`}
            >
              {GRAN_LABEL[g]}
            </button>
          ))}
        </div>
        <div className="ml-auto text-xs text-slate-400">
          Đang xem kỳ <span className="text-[#1b98e0] font-semibold">{periodLabel(activeKey, gran)}</span>
          {activeKey !== nowKey && prevKey && (
            <span className="text-slate-500"> (so với {periodLabel(prevKey, gran)})</span>
          )}
        </div>
      </div>

      {/* KPI kỳ đang chọn vs kỳ trước */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpiCards.map((k) => (
          <div key={k.label} className="card p-4">
            <div className="text-xs text-slate-400 mb-1">{k.label}</div>
            <div className="text-2xl font-bold">{k.cur}</div>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
              <GrowthBadge cur={k.cur} prev={k.prev} />
              <span>so với {prevKey ? periodLabel(prevKey, gran) : "kỳ trước"} ({k.prev})</span>
            </div>
          </div>
        ))}
      </div>

      {/* Biểu đồ tổng hợp theo từng kỳ */}
      <div className="card p-5">
        <div className="font-extrabold text-sm tracking-tight mb-4">
          TỔNG HỢP THEO TỪNG {GRAN_LABEL[gran].toUpperCase()} (GẦN NHẤT)
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={series}>
            <CartesianGrid stroke="var(--border-soft)" strokeDasharray="3 3" />
            <XAxis dataKey="label" stroke="#71839a" fontSize={11} />
            <YAxis stroke="#71839a" fontSize={11} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="activities" name="Thao tác hệ thống" fill="#7c5cff" radius={[4, 4, 0, 0]} />
            <Bar dataKey="tasksDone" name="Công việc hoàn thành" fill="#34d399" radius={[4, 4, 0, 0]} />
            <Bar dataKey="contentsPublished" name="Nội dung tạo mới" fill="#38bdf8" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Bảng so sánh từng kỳ */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border-soft)] bg-[var(--panel2)] flex flex-wrap items-center gap-2">
          <div className="font-extrabold text-sm">SO SÁNH TỪNG {GRAN_LABEL[gran].toUpperCase()}</div>
          <div className="text-[11px] text-slate-500 ml-auto">Bấm vào 1 dòng để xem chi tiết kỳ đó ở các khối trên</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border-soft)] bg-[var(--panel2)]">
                <th className="text-left text-xs text-slate-400 font-medium px-4 py-3">Kỳ</th>
                <th className="text-right text-xs text-slate-400 font-medium px-4 py-3">Công việc HT</th>
                <th className="text-right text-xs text-slate-400 font-medium px-4 py-3">Nội dung tạo</th>
                <th className="text-right text-xs text-slate-400 font-medium px-4 py-3">Lead chốt</th>
                <th className="text-right text-xs text-slate-400 font-medium px-4 py-3">Báo cáo nộp</th>
                <th className="text-right text-xs text-slate-400 font-medium px-4 py-3">Nhật ký</th>
                <th className="text-right text-xs text-slate-400 font-medium px-4 py-3">MXH</th>
                <th className="text-right text-xs text-slate-400 font-medium px-4 py-3">Ads</th>
                <th className="text-right text-xs text-slate-400 font-medium px-4 py-3">Tổng</th>
                <th className="text-right text-xs text-slate-400 font-medium px-4 py-3">So kỳ trước</th>
              </tr>
            </thead>
            <tbody>
              {[...series].reverse().map((row) => (
                <tr
                  key={row.key}
                  onClick={() => setSelectedKey(row.key)}
                  className={`border-b border-[var(--border-soft)] cursor-pointer transition ${
                    row.key === activeKey ? "bg-[#1b98e0]/10" : "hover:bg-[var(--panel2)]/50"
                  }`}
                >
                  <td className="px-4 py-3 text-sm font-medium">
                    {row.label}
                    {row.key === nowKey && (
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-[#1b98e0]/15 text-[#1b98e0]">hiện tại</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">{row.tasksDone}</td>
                  <td className="px-4 py-3 text-right text-sm">{row.contentsPublished}</td>
                  <td className="px-4 py-3 text-right text-sm">{row.leadsWon}</td>
                  <td className="px-4 py-3 text-right text-sm">{row.reportsSubmitted}</td>
                  <td className="px-4 py-3 text-right text-sm">{row.dailyReports}</td>
                  <td className="px-4 py-3 text-right text-sm">{row.socialEntries}</td>
                  <td className="px-4 py-3 text-right text-sm">{row.adsCreated}</td>
                  <td className="px-4 py-3 text-right text-sm font-bold">{row.total}</td>
                  <td className="px-4 py-3 text-right"><GrowthBadge cur={row.total} prev={row.prevTotal} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Hoạt động theo chức năng */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border-soft)] bg-[var(--panel2)]">
            <div className="font-extrabold text-sm">HOẠT ĐỘNG THEO CHỨC NĂNG</div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Kỳ {periodLabel(activeKey, gran)} so với {prevKey ? periodLabel(prevKey, gran) : "kỳ trước"}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border-soft)] bg-[var(--panel2)]">
                  <th className="text-left text-xs text-slate-400 font-medium px-4 py-3">Chức năng</th>
                  <th className="text-right text-xs text-slate-400 font-medium px-4 py-3">Kỳ này</th>
                  <th className="text-right text-xs text-slate-400 font-medium px-4 py-3">Kỳ trước</th>
                  <th className="text-right text-xs text-slate-400 font-medium px-4 py-3">Thay đổi</th>
                </tr>
              </thead>
              <tbody>
                {moduleRows.map((m) => (
                  <tr key={m.module} className="border-b border-[var(--border-soft)] hover:bg-[var(--panel2)]/50">
                    <td className="px-4 py-3 text-sm">{m.label}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold">{m.cur}</td>
                    <td className="px-4 py-3 text-right text-sm text-slate-400">{m.prev}</td>
                    <td className="px-4 py-3 text-right"><GrowthBadge cur={m.cur} prev={m.prev} /></td>
                  </tr>
                ))}
                {moduleRows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                      Chưa có hoạt động nào trong kỳ này.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Công việc hoàn thành theo người */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border-soft)] bg-[var(--panel2)]">
            <div className="font-extrabold text-sm">CÔNG VIỆC HOÀN THÀNH THEO NGƯỜI</div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Kỳ {periodLabel(activeKey, gran)} so với {prevKey ? periodLabel(prevKey, gran) : "kỳ trước"}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border-soft)] bg-[var(--panel2)]">
                  <th className="text-left text-xs text-slate-400 font-medium px-4 py-3">Người thực hiện</th>
                  <th className="text-right text-xs text-slate-400 font-medium px-4 py-3">Kỳ này</th>
                  <th className="text-right text-xs text-slate-400 font-medium px-4 py-3">Kỳ trước</th>
                  <th className="text-right text-xs text-slate-400 font-medium px-4 py-3">Thay đổi</th>
                </tr>
              </thead>
              <tbody>
                {assigneeRows.map((p) => (
                  <tr key={p.name} className="border-b border-[var(--border-soft)] hover:bg-[var(--panel2)]/50">
                    <td className="px-4 py-3 text-sm">{p.name}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold">{p.cur}</td>
                    <td className="px-4 py-3 text-right text-sm text-slate-400">{p.prev}</td>
                    <td className="px-4 py-3 text-right"><GrowthBadge cur={p.cur} prev={p.prev} /></td>
                  </tr>
                ))}
                {assigneeRows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                      Chưa có công việc nào hoàn thành trong kỳ này.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

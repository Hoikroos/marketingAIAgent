"use client";

import { useState, useEffect, useMemo, Fragment } from "react";
import { useSession } from "next-auth/react";
import { canAccess } from "@/lib/permissions";
import { TrendingUp, TrendingDown, CalendarDays, BarChart3, Target, Download, Edit3, Trash2 } from "./icons";
import ExcelJS from "exceljs";

type Metric = {
  id: number;
  platform: string;
  channel: string;
  followers: number;
  views: number;
  engagement: number;
  leads: number;
  note: string | null;
  weekLabel: string;
  createdAt?: string;
  owner?: { id: number; name: string };
};

type SocialChannel = {
  id: number;
  platform: string;
  name: string;
};

type WeekComparison = {
  weekLabel: string;
  followers: number;
  views: number;
  engagement: number;
  leads: number;
};

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
}

function getWeekLabel(date: Date): string {
  const start = new Date(date.getFullYear(), 0, 1);
  const week = Math.ceil(((date.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
  return `${date.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

function toDateInputStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseDateInput(s: string): Date | null {
  if (!s) return null;
  const d = new Date(`${s}T00:00:00`);
  return isNaN(d.getTime()) ? null : d;
}

// Danh sách các tuần (weekLabel) thuộc THÁNG của ngày đã chọn
function getWeeksOfMonth(dateStr: string): string[] {
  const d = parseDateInput(dateStr) || new Date();
  const year = d.getFullYear();
  const month = d.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weeks: string[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const label = getWeekLabel(new Date(year, month, day));
    if (!weeks.includes(label)) weeks.push(label);
  }
  return weeks;
}

// Tìm 1 ngày thuộc tuần weekLabel (để đặt lại input date khi sửa số liệu)
function weekLabelToDate(weekLabel: string): string {
  const year = parseInt(weekLabel.split("-W")[0], 10);
  if (isNaN(year)) return toDateInputStr(new Date());
  const d = new Date(year, 0, 1);
  for (let i = 0; i < 400; i++) {
    if (getWeekLabel(d) === weekLabel) return toDateInputStr(d);
    d.setDate(d.getDate() + 1);
  }
  return toDateInputStr(new Date());
}

export default function SocialStatusPanel() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const canCreate = canAccess(user, "social_create");
  const canUpdate = canAccess(user, "social_update");
  const canDelete = canAccess(user, "social_delete");
  const canExport = canAccess(user, "social_export");

  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [channels, setChannels] = useState<SocialChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Metric | null>(null);
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [selectedDate, setSelectedDate] = useState(() => toDateInputStr(new Date()));
  const [selectedMonth, setSelectedMonth] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`);
  const [compareChannel, setCompareChannel] = useState("all");

  // Tuần được suy ra từ ngày đang chọn
  const selectedWeek = useMemo(() => {
    const d = parseDateInput(selectedDate);
    return d ? getWeekLabel(d) : getWeekLabel(new Date());
  }, [selectedDate]);

  // Các tuần thuộc tháng của ngày đang chọn
  const compareWeeks = useMemo(() => getWeeksOfMonth(selectedDate), [selectedDate]);

  // Form state
  const [platform, setPlatform] = useState("Facebook");
  const [channel, setChannel] = useState("");
  const [followers, setFollowers] = useState("0");
  const [views, setViews] = useState("0");
  const [engagement, setEngagement] = useState("0");
  const [leads, setLeads] = useState("0");
  const [weekLabel, setWeekLabel] = useState(getWeekLabel(new Date()));
  const [weekDate, setWeekDate] = useState(() => toDateInputStr(new Date()));
  const [note, setNote] = useState("");

  function getCurrentWeek() {
    return getWeekLabel(new Date());
  }

  async function loadData() {
    setLoading(true);
    try {
      const [metricsRes, channelsRes] = await Promise.all([
        fetch("/api/social"),
        fetch("/api/social-channels"),
      ]);
      const metricsJson = await metricsRes.json().catch(() => []);
      const channelsJson = await channelsRes.json().catch(() => []);
      // Phòng vệ: API có thể trả mảng thuần hoặc object {ok, metrics/channels}
      setMetrics(Array.isArray(metricsJson) ? metricsJson : Array.isArray(metricsJson?.metrics) ? metricsJson.metrics : []);
      setChannels(Array.isArray(channelsJson) ? channelsJson : Array.isArray(channelsJson?.channels) ? channelsJson.channels : []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  // Danh sách kênh cho bộ lọc
  const channelsList = useMemo(
    () => Array.from(new Set(metrics.map((m) => m.channel))).sort(),
    [metrics]
  );

  // Week comparison data (đã lọc theo kênh đang chọn)
  const weekComparison = useMemo(() => {
    const source =
      compareChannel === "all"
        ? metrics
        : metrics.filter((m) => m.channel === compareChannel);
    const comparison: WeekComparison[] = [];
    for (const week of compareWeeks) {
      const weekMetrics = source.filter((m) => m.weekLabel === week);
      comparison.push({
        weekLabel: week,
        followers: weekMetrics.reduce((sum, m) => sum + m.followers, 0),
        views: weekMetrics.reduce((sum, m) => sum + m.views, 0),
        engagement: weekMetrics.reduce((sum, m) => sum + m.engagement, 0),
        leads: weekMetrics.reduce((sum, m) => sum + m.leads, 0),
      });
    }
    return comparison;
  }, [metrics, compareWeeks, compareChannel]);

  // So sánh các tuần THEO TỪNG KÊNH
  const channelWeekComparison = useMemo(() => {
    const chans = Array.from(new Set(metrics.map((m) => m.channel))).sort();
    return chans.map((ch) => {
      const chMetrics = metrics.filter((m) => m.channel === ch);
      return {
        channel: ch,
        platform: chMetrics[0]?.platform || "",
        weeks: compareWeeks.map((week) => {
          const weekMetrics = chMetrics.filter((m) => m.weekLabel === week);
          return {
            weekLabel: week,
            followers: weekMetrics.reduce((s, m) => s + m.followers, 0),
            views: weekMetrics.reduce((s, m) => s + m.views, 0),
            engagement: weekMetrics.reduce((s, m) => s + m.engagement, 0),
            leads: weekMetrics.reduce((s, m) => s + m.leads, 0),
          };
        }),
      };
    });
  }, [metrics, compareWeeks]);

  // Các tuần (weekLabel) thuộc tháng đang chọn
  const monthWeeks = useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    if (!year || !month) return [] as string[];
    const daysInMonth = new Date(year, month, 0).getDate();
    const weeks: string[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const label = getWeekLabel(new Date(year, month - 1, day));
      if (!weeks.includes(label)) weeks.push(label);
    }
    return weeks;
  }, [selectedMonth]);

  // Tổng hợp tháng: chỉ lấy số liệu thuộc các tuần của tháng đó (theo weekLabel)
  const monthlyStats = useMemo(() => {
    const monthMetrics = metrics.filter((m) => monthWeeks.includes(m.weekLabel));

    const byChannel = new Map<string, { followers: number; views: number; engagement: number; leads: number }>();
    for (const m of monthMetrics) {
      const existing = byChannel.get(m.channel) || { followers: 0, views: 0, engagement: 0, leads: 0 };
      byChannel.set(m.channel, {
        followers: existing.followers + m.followers,
        views: existing.views + m.views,
        engagement: existing.engagement + m.engagement,
        leads: existing.leads + m.leads,
      });
    }

    return Array.from(byChannel.entries()).map(([channel, data]) => ({ channel, ...data }));
  }, [metrics, monthWeeks]);

  // Calculate growth rate
  const calculateGrowth = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  // Current and previous week for comparison
  const currentWeekData = weekComparison[0];
  const previousWeekData = weekComparison[1];

  // Export to Excel
  async function exportToExcel() {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "AI Real Estate Marketing";
    workbook.created = new Date();

    // Sheet 1: So sánh theo tuần
    const weekSheet = workbook.addWorksheet("So sanh tuan", {
      headerFooter: { firstHeader: "So sánh theo tuần" }
    });

    // Header row
    weekSheet.columns = [
      { header: "Tuần", key: "weekLabel", width: 15 },
      { header: "Followers", key: "followers", width: 15 },
      { header: "Views", key: "views", width: 15 },
      { header: "Tương tác", key: "engagement", width: 15 },
      { header: "Leads", key: "leads", width: 15 },
      { header: "Tăng trưởng Views", key: "growth", width: 18 },
    ];

    // Style header
    weekSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    weekSheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1B98E0" },
    };
    weekSheet.getRow(1).alignment = { horizontal: "center", vertical: "middle" };

    // Add data
    weekComparison.forEach((week, idx) => {
      const prevWeek = weekComparison[idx + 1];
      const growth = prevWeek ? calculateGrowth(week.views, prevWeek.views) : 0;
      const row = weekSheet.addRow({
        weekLabel: week.weekLabel,
        followers: week.followers,
        views: week.views,
        engagement: week.engagement,
        leads: week.leads,
        growth: prevWeek ? `${growth >= 0 ? "+" : ""}${growth.toFixed(1)}%` : "-",
      });

      // Alternate row colors
      if (idx % 2 === 0) {
        row.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF0F7FF" },
        };
      }

      // Alignment
      row.alignment = { horizontal: "center", vertical: "middle" };

      // Growth color
      if (prevWeek) {
        const growthCell = row.getCell("growth");
        if (growth >= 0) {
          growthCell.font = { color: { argb: "FF00A86B" }, bold: true };
        } else {
          growthCell.font = { color: { argb: "FFFF4444" }, bold: true };
        }
      }
    });

    // Add totals row
    const totals = weekComparison[0];
    if (totals) {
      const totalFollowers = weekComparison.reduce((s, w) => s + w.followers, 0);
      const totalViews = weekComparison.reduce((s, w) => s + w.views, 0);
      const totalEngagement = weekComparison.reduce((s, w) => s + w.engagement, 0);
      const totalLeads = weekComparison.reduce((s, w) => s + w.leads, 0);

      const totalRow = weekSheet.addRow({
        weekLabel: "TỔNG",
        followers: totalFollowers,
        views: totalViews,
        engagement: totalEngagement,
        leads: totalLeads,
        growth: "",
      });
      totalRow.font = { bold: true };
      totalRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFD700" },
      };
      totalRow.alignment = { horizontal: "center", vertical: "middle" };
    }

    // Sheet 2: Thống kê theo tháng
    const monthSheet = workbook.addWorksheet("Thong ke thang");
    monthSheet.columns = [
      { header: "Kênh", key: "channel", width: 25 },
      { header: "Followers", key: "followers", width: 15 },
      { header: "Views", key: "views", width: 15 },
      { header: "Tương tác", key: "engagement", width: 15 },
      { header: "Leads", key: "leads", width: 15 },
    ];

    // Style header
    monthSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    monthSheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1B98E0" },
    };
    monthSheet.getRow(1).alignment = { horizontal: "center", vertical: "middle" };

    // Add data
    monthlyStats.forEach((stat, idx) => {
      const row = monthSheet.addRow(stat);
      if (idx % 2 === 0) {
        row.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF0F7FF" },
        };
      }
      row.alignment = { horizontal: "center", vertical: "middle" };
      row.getCell("channel").alignment = { horizontal: "left", vertical: "middle" };
    });

    // Add totals row
    if (monthlyStats.length > 0) {
      const totalRow = monthSheet.addRow({
        channel: "TỔNG",
        followers: monthlyStats.reduce((s, m) => s + m.followers, 0),
        views: monthlyStats.reduce((s, m) => s + m.views, 0),
        engagement: monthlyStats.reduce((s, m) => s + m.engagement, 0),
        leads: monthlyStats.reduce((s, m) => s + m.leads, 0),
      });
      totalRow.font = { bold: true };
      totalRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFD700" },
      };
      totalRow.alignment = { horizontal: "center", vertical: "middle" };
    }

    // Sheet 3: Dữ liệu chi tiết
    const detailSheet = workbook.addWorksheet("Du lieu chi tiet");
    detailSheet.columns = [
      { header: "Kênh", key: "channel", width: 20 },
      { header: "Nền tảng", key: "platform", width: 15 },
      { header: "Followers", key: "followers", width: 15 },
      { header: "Views", key: "views", width: 15 },
      { header: "Tương tác", key: "engagement", width: 15 },
      { header: "Leads", key: "leads", width: 15 },
      { header: "Tuần", key: "weekLabel", width: 15 },
      { header: "Ghi chú", key: "note", width: 30 },
    ];

    // Style header
    detailSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    detailSheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1B98E0" },
    };
    detailSheet.getRow(1).alignment = { horizontal: "center", vertical: "middle" };

    // Add data
    metrics.forEach((m, idx) => {
      const row = detailSheet.addRow({
        channel: m.channel,
        platform: m.platform,
        followers: m.followers,
        views: m.views,
        engagement: m.engagement,
        leads: m.leads,
        weekLabel: m.weekLabel,
        note: m.note || "",
      });
      if (idx % 2 === 0) {
        row.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF0F7FF" },
        };
      }
      row.alignment = { horizontal: "center", vertical: "middle" };
      row.getCell("channel").alignment = { horizontal: "left", vertical: "middle" };
      row.getCell("note").alignment = { horizontal: "left", vertical: "middle" };
    });

    // Generate and download file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bao-cao-mxh-${new Date().toISOString().split("T")[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!channel) return;

    const body = { platform, channel, followers, views, engagement, leads, weekLabel, note };
    const url = editing ? `/api/social` : "/api/social";
    const method = editing ? "PATCH" : "POST";
    if (editing) (body as any).id = editing.id;

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setShowForm(false);
        setEditing(null);
        resetForm();
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  }

  function resetForm() {
    setPlatform("Facebook");
    setChannel("");
    setFollowers("0");
    setViews("0");
    setEngagement("0");
    setLeads("0");
    setWeekLabel(getWeekLabel(new Date()));
    setWeekDate(toDateInputStr(new Date()));
    setNote("");
  }

  function startEdit(m: Metric) {
    setEditing(m);
    setPlatform(m.platform);
    setChannel(m.channel);
    setFollowers(m.followers.toString());
    setViews(m.views.toString());
    setEngagement(m.engagement.toString());
    setLeads(m.leads.toString());
    setWeekLabel(m.weekLabel);
    setWeekDate(weekLabelToDate(m.weekLabel));
    setNote(m.note || "");
    setShowForm(true);
  }

  async function handleDelete(id: number) {
    if (!confirm("Xoá số liệu này?")) return;
    try {
      const res = await fetch("/api/social", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) loadData();
    } catch (err) {
      console.error(err);
    }
  }

  // Get latest metrics for table
  const latestMetrics = useMemo(() => {
    const latestByChannel = new Map<string, Metric>();
    for (const m of metrics) {
      const existing = latestByChannel.get(m.channel);
      if (!existing || m.weekLabel > existing.weekLabel) {
        latestByChannel.set(m.channel, m);
      }
    }
    return Array.from(latestByChannel.values()).sort((a, b) => b.weekLabel.localeCompare(a.weekLabel));
  }, [metrics]);

  // TẤT CẢ số liệu để sửa/xoá — phân trang 10 dòng/trang
  const [manageChannel, setManageChannel] = useState("all");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const allMetrics = useMemo(() => {
    const source =
      manageChannel === "all" ? metrics : metrics.filter((m) => m.channel === manageChannel);
    return [...source].sort((a, b) => b.weekLabel.localeCompare(a.weekLabel));
  }, [metrics, manageChannel]);

  const totalPages = Math.max(1, Math.ceil(allMetrics.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedMetrics = useMemo(
    () => allMetrics.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [allMetrics, safePage]
  );

  // Các tháng có dữ liệu — suy từ weekLabel (quét 7 ngày của tuần vì tuần có thể vắt tháng)
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    const weekLabels = new Set(metrics.map((m) => m.weekLabel));
    weekLabels.forEach((wl) => {
      const start = parseDateInput(weekLabelToDate(wl));
      if (!start) return;
      for (let i = 0; i < 7; i++) {
        const d = new Date(start.getTime() + i * 86400000);
        months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
      }
    });
    return Array.from(months).sort().reverse();
  }, [metrics]);

  const platformChannels = channels.filter((c) => c.platform === platform);

  if (loading) {
    return (
      <div className="card p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-[var(--panel2)] rounded w-1/3"></div>
          <div className="h-32 bg-[var(--panel2)] rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with View Mode Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode("week")}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition ${
              viewMode === "week" ? "bg-[#1b98e0] text-white" : "bg-[var(--panel2)] text-slate-400 hover:bg-[var(--panel2)]/80"
            }`}
          >
            <Target size={14} className="inline mr-1" /> Theo tuần
          </button>
          <button
            onClick={() => setViewMode("month")}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition ${
              viewMode === "month" ? "bg-[#1b98e0] text-white" : "bg-[var(--panel2)] text-slate-400 hover:bg-[var(--panel2)]/80"
            }`}
          >
            <BarChart3 size={14} className="inline mr-1" /> Thống kê tháng
          </button>
        </div>
        <div className="flex items-center gap-2">
          {canExport && (
            <button
              onClick={exportToExcel}
              className="px-3 py-2 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition flex items-center gap-1"
            >
              <Download size={14} /> Xuất Excel
            </button>
          )}
          {canCreate && (
            <button
              onClick={() => { setShowForm(true); setEditing(null); resetForm(); }}
              className="btn-primary text-xs"
            >
              + Nhập số liệu
            </button>
          )}
        </div>
      </div>

      {/* Week Comparison View */}
      {viewMode === "week" && (
        <>
          {/* Week Picker */}
          <div className="card p-4">
            <div className="flex items-center gap-3 mb-4">
              <CalendarDays size={16} className="text-[#1b98e0]" />
              <span className="text-sm font-medium">So sánh theo tuần</span>
              <select
                value={compareChannel}
                onChange={(e) => setCompareChannel(e.target.value)}
                className="input text-xs py-1.5 px-2 max-w-[180px]"
              >
                <option value="all">Tất cả kênh</option>
                {channelsList.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs px-2 py-1 rounded-lg bg-[#1b98e0]/10 text-[#1b98e0] font-medium whitespace-nowrap">
                  Tháng {selectedDate.slice(0, 7)} • {compareWeeks.length} tuần
                </span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="input text-xs py-1.5 px-2"
                />
              </div>
            </div>
            <div className="text-xs text-slate-500 mb-3">
              Đang xem tuần <span className="text-[#1b98e0] font-semibold">{selectedWeek}</span> — bảng bên dưới gồm tất cả các tuần thuộc tháng của ngày đã chọn.
            </div>

            {/* Week KPI Cards with Comparison */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "Followers", current: currentWeekData?.followers || 0, previous: previousWeekData?.followers || 0 },
                { label: "Views", current: currentWeekData?.views || 0, previous: previousWeekData?.views || 0 },
                { label: "Tương tác", current: currentWeekData?.engagement || 0, previous: previousWeekData?.engagement || 0 },
                { label: "Leads", current: currentWeekData?.leads || 0, previous: previousWeekData?.leads || 0 },
              ].map((kpi) => {
                const growth = calculateGrowth(kpi.current, kpi.previous);
                const isPositive = growth >= 0;
                return (
                  <div key={kpi.label} className="p-3 bg-[var(--panel2)] rounded-lg">
                    <div className="text-xs text-slate-400 mb-1">{kpi.label}</div>
                    <div className="text-xl font-bold">{formatNumber(kpi.current)}</div>
                    <div className={`flex items-center gap-1 text-xs mt-1 ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
                      {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {growth.toFixed(1)}% so với tuần trước
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Week Comparison Table */}
      {viewMode === "week" && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border-soft)] bg-[var(--panel2)]">
            <div className="font-extrabold text-sm">SO SÁNH CÁC TUẦN</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border-soft)]">
                  <th className="text-left text-xs text-slate-400 font-medium px-4 py-3">Tuần</th>
                  <th className="text-right text-xs text-slate-400 font-medium px-4 py-3">Followers</th>
                  <th className="text-right text-xs text-slate-400 font-medium px-4 py-3">Views</th>
                  <th className="text-right text-xs text-slate-400 font-medium px-4 py-3">Tương tác</th>
                  <th className="text-right text-xs text-slate-400 font-medium px-4 py-3">Leads</th>
                  <th className="text-right text-xs text-slate-400 font-medium px-4 py-3">Tăng trưởng</th>
                </tr>
              </thead>
              <tbody>
                {channelWeekComparison
                  .filter((c) => compareChannel === "all" || c.channel === compareChannel)
                  .map(({ channel, platform, weeks }) => (
                    <Fragment key={channel}>
                      {/* Header theo kênh */}
                      <tr className="bg-[var(--panel2)]">
                        <td colSpan={6} className="px-4 py-2">
                          <span className="text-xs font-bold text-[#1b98e0] uppercase tracking-wide">{channel}</span>
                          <span className="text-[10px] text-slate-500 ml-2">{platform}</span>
                        </td>
                      </tr>
                      {weeks.map((w, idx) => {
                        const prevWeek = weeks[idx + 1];
                        const hasData = w.views > 0 || w.followers > 0 || w.engagement > 0 || w.leads > 0;
                        const growth =
                          prevWeek && (prevWeek.views > 0 || w.views > 0)
                            ? calculateGrowth(w.views, prevWeek.views)
                            : null;
                        const isPositive = (growth ?? 0) >= 0;
                        return (
                          <tr key={w.weekLabel} className={`border-b border-[var(--border-soft)] hover:bg-[var(--panel2)]/50 ${w.weekLabel === selectedWeek ? "bg-[#1b98e0]/10" : ""}`}>
                            <td className="px-8 py-3 text-sm text-slate-300">{w.weekLabel}</td>
                            <td className="px-4 py-3 text-right text-sm">{formatNumber(w.followers)}</td>
                            <td className="px-4 py-3 text-right text-sm">{formatNumber(w.views)}</td>
                            <td className="px-4 py-3 text-right text-sm">{formatNumber(w.engagement)}</td>
                            <td className="px-4 py-3 text-right text-sm">{formatNumber(w.leads)}</td>
                            <td className="px-4 py-3 text-right">
                              {growth !== null ? (
                                <span className={`text-xs font-medium ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
                                  {isPositive ? "+" : ""}{growth.toFixed(1)}%
                                </span>
                              ) : (
                                <span className="text-xs text-slate-500">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  ))}
                {channelWeekComparison.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      Chưa có số liệu. Nhấn "Nhập số liệu" để bắt đầu.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Monthly Statistics View */}
      {viewMode === "month" && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border-soft)] bg-[var(--panel2)] flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-extrabold text-sm">THỐNG KÊ THEO THÁNG</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Gộp các tuần: {monthWeeks.length > 0 ? monthWeeks.join(", ") : "-"}
              </div>
            </div>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="input text-xs py-1 px-2"
            >
              {availableMonths.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
              {!availableMonths.includes(selectedMonth) && (
                <option value={selectedMonth}>{selectedMonth}</option>
              )}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border-soft)]">
                  <th className="text-left text-xs text-slate-400 font-medium px-4 py-3">Kênh</th>
                  <th className="text-right text-xs text-slate-400 font-medium px-4 py-3">Followers</th>
                  <th className="text-right text-xs text-slate-400 font-medium px-4 py-3">Views</th>
                  <th className="text-right text-xs text-slate-400 font-medium px-4 py-3">Tương tác</th>
                  <th className="text-right text-xs text-slate-400 font-medium px-4 py-3">Leads</th>
                </tr>
              </thead>
              <tbody>
                {monthlyStats.map((stat) => (
                  <tr key={stat.channel} className="border-b border-[var(--border-soft)] hover:bg-[var(--panel2)]/50">
                    <td className="px-4 py-3 text-sm font-medium">{stat.channel}</td>
                    <td className="px-4 py-3 text-right text-sm">{formatNumber(stat.followers)}</td>
                    <td className="px-4 py-3 text-right text-sm">{formatNumber(stat.views)}</td>
                    <td className="px-4 py-3 text-right text-sm">{formatNumber(stat.engagement)}</td>
                    <td className="px-4 py-3 text-right text-sm">{formatNumber(stat.leads)}</td>
                  </tr>
                ))}
                {monthlyStats.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      Chưa có số liệu cho tháng này.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {monthlyStats.length > 0 && (
            <div className="px-4 py-3 border-t border-[var(--border-soft)] bg-[var(--panel2)]/50">
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-xs text-slate-400">Tổng Followers</div>
                  <div className="font-bold">{formatNumber(monthlyStats.reduce((s, m) => s + m.followers, 0))}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Tổng Views</div>
                  <div className="font-bold">{formatNumber(monthlyStats.reduce((s, m) => s + m.views, 0))}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Tổng Tương tác</div>
                  <div className="font-bold">{formatNumber(monthlyStats.reduce((s, m) => s + m.engagement, 0))}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Tổng Leads</div>
                  <div className="font-bold">{formatNumber(monthlyStats.reduce((s, m) => s + m.leads, 0))}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--panel)] border border-[var(--border)] rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[var(--panel)] border-b border-[var(--border-soft)] p-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">{editing ? "Sửa số liệu" : "Nhập số liệu mới"}</h2>
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Nền tảng</label>
                  <select value={platform} onChange={(e) => { setPlatform(e.target.value); setChannel(""); }} className="input">
                    <option>Facebook</option>
                    <option>TikTok</option>
                    <option>YouTube</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Kênh</label>
                  <select value={channel} onChange={(e) => setChannel(e.target.value)} className="input">
                    <option value="">Chọn kênh</option>
                    {platformChannels.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Followers</label>
                  <input type="number" value={followers} onChange={(e) => setFollowers(e.target.value)} className="input" />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Views</label>
                  <input type="number" value={views} onChange={(e) => setViews(e.target.value)} className="input" />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Tương tác</label>
                  <input type="number" value={engagement} onChange={(e) => setEngagement(e.target.value)} className="input" />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Leads</label>
                  <input type="number" value={leads} onChange={(e) => setLeads(e.target.value)} className="input" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Chọn ngày (tự suy ra tuần)</label>
                <input
                  type="date"
                  value={weekDate}
                  onChange={(e) => {
                    setWeekDate(e.target.value);
                    const d = parseDateInput(e.target.value);
                    if (d) setWeekLabel(getWeekLabel(d));
                  }}
                  className="input"
                />
                <div className="text-[11px] text-slate-500 mt-1">Thuộc tuần: <span className="text-[#1b98e0]">{weekLabel}</span></div>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Ghi chú</label>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="input" />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border-soft)]">
                <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition">Huỷ</button>
                <button type="submit" className="btn-primary">{editing ? "Cập nhật" : "Lưu"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bảng tất cả số liệu (sửa/xoá) — phân trang */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border-soft)] bg-[var(--panel2)] flex flex-wrap items-center gap-2">
          <div className="font-extrabold text-sm">TẤT CẢ SỐ LIỆU ({allMetrics.length})</div>
          <select
            value={manageChannel}
            onChange={(e) => { setManageChannel(e.target.value); setPage(1); }}
            className="input text-xs py-1 px-2 ml-auto max-w-[180px]"
          >
            <option value="all">Tất cả kênh</option>
            {channelsList.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border-soft)] bg-[var(--panel2)]">
                <th className="text-left text-xs text-slate-400 font-medium px-4 py-3">Kênh</th>
                {user?.role === "Admin" && <th className="text-left text-xs text-slate-400 font-medium px-4 py-3">Người tạo</th>}
                <th className="text-right text-xs text-slate-400 font-medium px-4 py-3">Followers</th>
                <th className="text-right text-xs text-slate-400 font-medium px-4 py-3">Views</th>
                <th className="text-right text-xs text-slate-400 font-medium px-4 py-3">Tương tác</th>
                <th className="text-right text-xs text-slate-400 font-medium px-4 py-3">Leads</th>
                <th className="text-left text-xs text-slate-400 font-medium px-4 py-3">Tuần</th>
                {(canUpdate || canDelete) && <th className="text-right text-xs text-slate-400 font-medium px-4 py-3">Thao tác</th>}
              </tr>
            </thead>
            <tbody>
              {pagedMetrics.map((m) => (
                <tr key={m.id} className="border-b border-[var(--border-soft)] hover:bg-[var(--panel2)]/50">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium">{m.channel}</div>
                    <div className="text-xs text-slate-500">{m.platform}</div>
                  </td>
                  {user?.role === "Admin" && (
                    <td className="px-4 py-3 text-xs text-slate-400">{m.owner?.name || "-"}</td>
                  )}
                  <td className="px-4 py-3 text-right text-sm">{formatNumber(m.followers)}</td>
                  <td className="px-4 py-3 text-right text-sm">{formatNumber(m.views)}</td>
                  <td className="px-4 py-3 text-right text-sm">{formatNumber(m.engagement)}</td>
                  <td className="px-4 py-3 text-right text-sm">{formatNumber(m.leads)}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{m.weekLabel}</td>
                  {(canUpdate || canDelete) && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canUpdate && (
                          <button onClick={() => startEdit(m)} className="p-2 text-[#1b98e0] hover:bg-[#1b98e0]/10 rounded-lg transition" title="Sửa">
                            <Edit3 size={15} />
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => handleDelete(m.id)} className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition" title="Xoá">
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {allMetrics.length === 0 && (
                <tr>
                  <td colSpan={(canUpdate || canDelete) ? (user?.role === "Admin" ? 8 : 7) : (user?.role === "Admin" ? 7 : 6)} className="px-4 py-8 text-center text-slate-400">
                    Chưa có số liệu. Nhấn "Nhập số liệu" để bắt đầu.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {allMetrics.length > 0 && (
          <div className="px-4 py-3 border-t border-[var(--border-soft)] bg-[var(--panel2)]/50 flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-slate-400">
              Hiển thị {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, allMetrics.length)} trên {allMetrics.length} bản ghi
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setPage(1)} disabled={safePage === 1} className="px-2 py-1 rounded-lg text-xs bg-[var(--panel)] text-slate-300 disabled:opacity-40 hover:bg-[var(--panel2)] transition">«</button>
              <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1} className="px-2 py-1 rounded-lg text-xs bg-[var(--panel)] text-slate-300 disabled:opacity-40 hover:bg-[var(--panel2)] transition">‹</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => Math.abs(p - safePage) <= 2 || p === 1 || p === totalPages)
                .map((p, i, arr) => (
                  <Fragment key={p}>
                    {i > 0 && arr[i - 1] !== p - 1 && <span className="text-xs text-slate-500 px-1">…</span>}
                    <button
                      type="button"
                      onClick={() => setPage(p)}
                      className={`w-7 h-7 rounded-lg text-xs font-medium transition ${p === safePage ? "bg-[#1b98e0] text-white" : "bg-[var(--panel)] text-slate-300 hover:bg-[var(--panel2)]"}`}
                    >
                      {p}
                    </button>
                  </Fragment>
                ))}
              <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} className="px-2 py-1 rounded-lg text-xs bg-[var(--panel)] text-slate-300 disabled:opacity-40 hover:bg-[var(--panel2)] transition">›</button>
              <button type="button" onClick={() => setPage(totalPages)} disabled={safePage === totalPages} className="px-2 py-1 rounded-lg text-xs bg-[var(--panel)] text-slate-300 disabled:opacity-40 hover:bg-[var(--panel2)] transition">»</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
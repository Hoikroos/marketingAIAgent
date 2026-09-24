/**
 * Thống kê MẠNG XÃ HỘI (model SocialMetric) theo TUẦN / THÁNG — dùng cho khối
 * "Báo cáo mạng xã hội" trên Dashboard (components/SocialReportPanel.tsx).
 *
 * Quy ước số liệu (giống cách nhập ở trang Trạng thái mạng xã hội):
 *  - followers   : số lượt follow HIỆN TẠI của kênh (ảnh chụp theo tuần)
 *                  → trong 1 kỳ chỉ lấy ảnh chụp MỚI NHẤT của mỗi kênh rồi cộng
 *                  các kênh lại, KHÔNG cộng dồn qua nhiều tuần.
 *  - videosPosted: số video ĐÃ ĐĂNG trong tuần  → cộng dồn theo kỳ.
 *  - views       : view phát sinh trong tuần     → cộng dồn theo kỳ.
 *  - engagement  : tương tác trong tuần          → cộng dồn theo kỳ.
 *  - avgViews (view TB/video) = tổng view của kỳ ÷ số video đã đăng của kỳ.
 *
 * Cách đánh số tuần dùng chung `periodKey/periodLabel` của lib/workStats.ts
 * ("2026-W38") nên số liệu khớp với Báo cáo công việc & Thống kê công việc.
 * Tháng = gộp các TUẦN có ít nhất 1 ngày trong tháng (giống trang Trạng thái
 * mạng xã hội) — tuần nằm ở ranh giới 2 tháng sẽ được tính cho cả 2 tháng.
 *
 * Module THUẦN (không prisma / react) → dùng được ở server lẫn client và test
 * được bằng `npx tsx scripts/test-socialstats.ts`.
 */
import { periodKey, periodLabel } from "@/lib/workStats";

/** 1 dòng SocialMetric (chỉ các cột cần cho thống kê) */
export type SocialMetricRow = {
  platform: string;
  channel: string;
  followers: number;
  views: number;
  engagement: number;
  videosPosted: number;
  weekLabel: string; // "2026-W38"
};

/** Số liệu tổng hợp của 1 kỳ (tuần hoặc tháng) */
export type SocialPeriodStat = {
  key: string; // "2026-W38" (tuần) hoặc "2026-09" (tháng)
  label: string; // "Tuần 38/2026" / "T9/2026"
  range: string; // "21/09 – 27/09"
  followers: number; // lượt follow hiện tại (ảnh chụp mới nhất mỗi kênh)
  videos: number; // video đã đăng trong kỳ
  views: number; // view phát sinh trong kỳ
  engagement: number; // tương tác trong kỳ
  avgViews: number; // view trung bình mỗi video trong kỳ
  channels: number; // số kênh có số liệu trong kỳ
};

/** Số liệu mới nhất của 1 kênh (bảng "theo kênh") */
export type SocialChannelRow = {
  channel: string;
  platform: string;
  weekLabel: string;
  followers: number;
  videos: number;
  views: number;
  avgViews: number;
};

/** 1 tháng trong chuỗi thời gian */
export type SocialMonthRef = { key: string; label: string; year: number; month: number };

const fmtDay = (d: Date) => d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
const channelKey = (r: SocialMetricRow) => `${r.platform}|${r.channel}`;

/** Ngày đầu/cuối của tuần có nhãn weekLabel ("2026-W38"); null nếu nhãn không hợp lệ */
export function weekRange(label: string): { from: Date; to: Date } | null {
  const year = Number(label.split("-W")[0]);
  if (!Number.isFinite(year) || year < 1970) return null;
  let from: Date | null = null;
  let to: Date | null = null;
  const d = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);
  while (d < end) {
    if (periodKey(d, "week") === label) {
      if (!from) from = new Date(d);
      to = new Date(d);
    } else if (from) {
      break; // đã đi hết tuần đó
    }
    d.setDate(d.getDate() + 1);
  }
  return from && to ? { from, to } : null;
}

/** Các tuần (nhãn "YYYY-Wxx") có ít nhất 1 ngày trong tháng (month: 1..12) */
export function weeksOfMonth(year: number, month: number): string[] {
  const days = new Date(year, month, 0).getDate();
  const out: string[] = [];
  for (let day = 1; day <= days; day++) {
    const label = periodKey(new Date(year, month - 1, day), "week");
    if (!out.includes(label)) out.push(label);
  }
  return out;
}

/** N nhãn tuần gần nhất (cũ → mới), đi lùi 7 ngày một từ `from` (mặc định hôm nay) */
export function recentWeekLabels(n: number, from: Date = new Date()): string[] {
  const out: string[] = [];
  const cur = new Date(from);
  for (let i = 0; i < n; i++) {
    const label = periodKey(cur, "week");
    if (!out.includes(label)) out.push(label);
    cur.setDate(cur.getDate() - 7);
  }
  return out.reverse();
}

/** N tháng gần nhất (cũ → mới) tính từ tháng của `from` */
export function recentMonths(n: number, from: Date = new Date()): SocialMonthRef[] {
  const out: SocialMonthRef[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(from.getFullYear(), from.getMonth() - i, 1);
    const key = periodKey(d, "month");
    out.push({ key, label: periodLabel(key, "month"), year: d.getFullYear(), month: d.getMonth() + 1 });
  }
  return out.reverse();
}

/** Ảnh chụp MỚI NHẤT của mỗi kênh (theo weekLabel; cùng tuần thì lấy followers lớn nhất) */
function latestPerChannel(metrics: SocialMetricRow[]): Map<string, SocialMetricRow> {
  const latest = new Map<string, SocialMetricRow>();
  for (const r of metrics || []) {
    if (!r) continue;
    const k = channelKey(r);
    const cur = latest.get(k);
    if (!cur || r.weekLabel > cur.weekLabel || (r.weekLabel === cur.weekLabel && (r.followers || 0) > (cur.followers || 0))) {
      latest.set(k, r);
    }
  }
  return latest;
}

type Aggregate = Pick<SocialPeriodStat, "followers" | "videos" | "views" | "engagement" | "avgViews" | "channels">;

/** Gộp số liệu của 1 kỳ: followers = ảnh chụp mới nhất mỗi kênh; còn lại cộng dồn */
export function aggregateMetrics(rows: SocialMetricRow[]): Aggregate {
  const latest = latestPerChannel(rows);
  let videos = 0;
  let views = 0;
  let engagement = 0;
  for (const r of rows || []) {
    videos += r.videosPosted || 0;
    views += r.views || 0;
    engagement += r.engagement || 0;
  }
  let followers = 0;
  for (const r of latest.values()) followers += r.followers || 0;
  return {
    followers,
    videos,
    views,
    engagement,
    channels: latest.size,
    avgViews: videos > 0 ? Math.round(views / videos) : 0,
  };
}

/** Chuỗi N tuần gần nhất (kỳ rỗng vẫn trả 0 để dễ đọc báo cáo) */
export function socialStatsByWeek(metrics: SocialMetricRow[], n = 8, from: Date = new Date()): SocialPeriodStat[] {
  return recentWeekLabels(n, from).map((label) => {
    const rows = (metrics || []).filter((m) => m && m.weekLabel === label);
    const r = weekRange(label);
    return {
      key: label,
      label: periodLabel(label, "week"),
      range: r ? `${fmtDay(r.from)} – ${fmtDay(r.to)}` : "",
      ...aggregateMetrics(rows),
    };
  });
}

/** Chuỗi N tháng gần nhất — mỗi tháng gộp các tuần có ngày trong tháng đó */
export function socialStatsByMonth(metrics: SocialMetricRow[], n = 6, from: Date = new Date()): SocialPeriodStat[] {
  return recentMonths(n, from).map((mo) => {
    const weeks = weeksOfMonth(mo.year, mo.month);
    const rows = (metrics || []).filter((m) => m && weeks.includes(m.weekLabel));
    const first = new Date(mo.year, mo.month - 1, 1);
    const last = new Date(mo.year, mo.month, 0);
    return {
      key: mo.key,
      label: mo.label,
      range: `${fmtDay(first)} – ${fmtDay(last)}`,
      ...aggregateMetrics(rows),
    };
  });
}

/** Số liệu mới nhất của từng kênh (sắp theo lượt follow giảm dần) */
export function latestChannelRows(metrics: SocialMetricRow[]): SocialChannelRow[] {
  return [...latestPerChannel(metrics).values()]
    .map((r) => ({
      channel: r.channel,
      platform: r.platform,
      weekLabel: r.weekLabel,
      followers: r.followers || 0,
      videos: r.videosPosted || 0,
      views: r.views || 0,
      avgViews: r.videosPosted > 0 ? Math.round((r.views || 0) / r.videosPosted) : 0,
    }))
    .sort((a, b) => b.followers - a.followers || a.channel.localeCompare(b.channel));
}

/** Tổng lượt follow hiện tại = ảnh chụp mới nhất của mỗi kênh cộng lại */
export function totalFollowers(metrics: SocialMetricRow[]): number {
  let sum = 0;
  for (const r of latestPerChannel(metrics).values()) sum += r.followers || 0;
  return sum;
}

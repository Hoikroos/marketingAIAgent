/**
 * Kiểm tra thống kê MẠNG XÃ HỘI theo tuần/tháng (khối "Báo cáo mạng xã hội" trên Dashboard):
 *  1. weekRange / weeksOfMonth / recentWeekLabels / recentMonths — mốc thời gian.
 *  2. socialStatsByWeek — followers lấy ảnh chụp MỚI NHẤT mỗi kênh (không cộng dồn),
 *     video/view/tương tác cộng dồn, view TB/video = view ÷ video.
 *  3. socialStatsByMonth — gộp các tuần có ngày trong tháng.
 *  4. latestChannelRows / totalFollowers — số liệu mới nhất theo kênh.
 * Chạy: npx tsx scripts/test-socialstats.ts
 */
import { periodKey } from "../lib/workStats";
import {
  aggregateMetrics,
  latestChannelRows,
  recentMonths,
  recentWeekLabels,
  socialStatsByMonth,
  socialStatsByWeek,
  totalFollowers,
  weekRange,
  weeksOfMonth,
  type SocialMetricRow,
} from "../lib/socialStats";

let failed = 0;
function check(name: string, cond: boolean, extra = "") {
  if (cond) {
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ ${name}${extra ? ` — ${extra}` : ""}`);
  }
}

const FROM = new Date(2026, 8, 15); // 15/09/2026
const CUR = periodKey(FROM, "week");
const PREV = periodKey(new Date(2026, 8, 8), "week");

// ---------------------------------------------------------------------------
console.log("1) Mốc thời gian tuần / tháng");
const range = weekRange(CUR);
check("weekRange trả về dải ngày", !!range && range.from <= FROM && FROM <= range.to, JSON.stringify(range));
if (range) {
  let sameLabel = true;
  let days = 0;
  const d = new Date(range.from);
  while (d <= range.to) {
    if (periodKey(d, "week") !== CUR) sameLabel = false;
    days++;
    d.setDate(d.getDate() + 1);
  }
  check("mọi ngày trong dải đều thuộc tuần đó", sameLabel, CUR);
  check("dải tuần dài 7 ngày", days === 7, `${days} ngày`);
}
check("weekRange nhãn sai → null", weekRange("2026-W99") === null);

const sepWeeks = weeksOfMonth(2026, 9);
check("weeksOfMonth(9/2026) gồm tuần hiện tại & tuần trước", sepWeeks.includes(CUR) && sepWeeks.includes(PREV), JSON.stringify(sepWeeks));
check(
  "các tuần của tháng đều có ngày trong tháng 9",
  sepWeeks.every((w) => {
    const r = weekRange(w);
    if (!r) return false;
    const d = new Date(r.from);
    while (d <= r.to) {
      if (d.getFullYear() === 2026 && d.getMonth() === 8) return true;
      d.setDate(d.getDate() + 1);
    }
    return false;
  })
);

const w8 = recentWeekLabels(8, FROM);
check("recentWeekLabels trả 8 tuần, mới nhất ở cuối", w8.length === 8 && w8[7] === CUR, JSON.stringify(w8));
check("recentWeekLabels không trùng nhau", new Set(w8).size === 8);
const m6 = recentMonths(6, FROM);
check("recentMonths trả 6 tháng (mới nhất T9/2026)", m6.length === 6 && m6[5].key === "2026-09" && m6[0].key === "2026-04", JSON.stringify(m6.map((m) => m.key)));

// ---------------------------------------------------------------------------
console.log("2) socialStatsByWeek — follow không cộng dồn, video/view cộng dồn");
const rows: SocialMetricRow[] = [
  { platform: "TikTok", channel: "A", followers: 1000, videosPosted: 2, views: 400, engagement: 20, weekLabel: PREV },
  { platform: "TikTok", channel: "A", followers: 1200, videosPosted: 3, views: 600, engagement: 30, weekLabel: CUR },
  { platform: "YouTube", channel: "B", followers: 500, videosPosted: 1, views: 100, engagement: 5, weekLabel: PREV },
];
const weekly = socialStatsByWeek(rows, 8, FROM);
const wCur = weekly[weekly.length - 1];
const wPrev = weekly[weekly.length - 2];
const wEmpty = weekly[weekly.length - 3];
check("tuần mới nhất: follow = ảnh chụp của kênh có số liệu", wCur.followers === 1200 && wCur.channels === 1, JSON.stringify(wCur));
check("tuần mới nhất: video/view/tương tác cộng dồn", wCur.videos === 3 && wCur.views === 600 && wCur.engagement === 30, JSON.stringify(wCur));
check("tuần mới nhất: view TB/video = 600/3", wCur.avgViews === 200, String(wCur.avgViews));
check("tuần trước: follow cộng 2 kênh (1000+500)", wPrev.followers === 1500 && wPrev.channels === 2, JSON.stringify(wPrev));
check("tuần trước: view TB/video làm tròn 500/3", wPrev.avgViews === 167, String(wPrev.avgViews));
check("tuần rỗng → 0, không chia cho 0", wEmpty.channels === 0 && wEmpty.avgViews === 0 && wEmpty.followers === 0, JSON.stringify(wEmpty));
check("kỳ có nhãn + khoảng ngày", weekly.every((s) => s.label.startsWith("Tuần ") && s.range.includes("–")), JSON.stringify(weekly[weekly.length - 1]));

// ---------------------------------------------------------------------------
console.log("3) socialStatsByMonth — gộp theo tuần của tháng");
const monthly = socialStatsByMonth(rows, 6, FROM);
const mSep = monthly[monthly.length - 1];
check("tháng 9/2026 gộp đúng 2 kênh", mSep.followers === 1700 && mSep.channels === 2, JSON.stringify(mSep));
check("follow KHÔNG cộng dồn qua tuần (1000+1200+500=2700 ≠ 1700)", mSep.followers !== 2700, String(mSep.followers));
check("video đã đăng cộng theo tuần (2+3+1)", mSep.videos === 6, String(mSep.videos));
check("view cộng theo tuần (400+600+100)", mSep.views === 1100, String(mSep.views));
check("view TB/video = 1100/6", mSep.avgViews === 183, String(mSep.avgViews));
check("tháng rỗng (T4/2026) → 0", monthly[0].channels === 0 && monthly[0].videos === 0, JSON.stringify(monthly[0]));

// ---------------------------------------------------------------------------
console.log("4) Bảng theo kênh & tổng follow");
const dup: SocialMetricRow[] = [
  ...rows,
  { platform: "TikTok", channel: "A", followers: 900, videosPosted: 1, views: 50, engagement: 1, weekLabel: CUR },
];
const chans = latestChannelRows(dup);
check(
  "mỗi kênh 1 dòng, kênh A mới nhất = 1200 (lấy số lớn nhất trong cùng tuần)",
  chans.length === 2 && chans[0].channel === "A" && chans[0].followers === 1200,
  JSON.stringify(chans)
);
check("sắp theo follow giảm dần", chans[0].followers >= chans[1].followers);
check("dòng kênh có tuần + view TB/video", chans[0].weekLabel === CUR && chans[0].avgViews === 200, JSON.stringify(chans[0]));
check("totalFollowers = 1200 + 500", totalFollowers(dup) === 1700, String(totalFollowers(dup)));
check("totalFollowers không phải tổng ngây thơ 2600", totalFollowers(dup) !== 2600);
check("aggregateMetrics: 0 video → avgViews 0", aggregateMetrics([{ ...rows[0], videosPosted: 0 }]).avgViews === 0);
check("danh sách rỗng không lỗi", totalFollowers([]) === 0 && latestChannelRows([]).length === 0 && socialStatsByWeek([], 4, FROM).length === 4);

if (failed) {
  console.error(`\n❌ ${failed} kiểm tra KHÔNG đạt`);
  process.exit(1);
}
console.log("\n✅ Thống kê MXH theo tuần/tháng OK — follow không cộng dồn, view TB/video tính đúng.");


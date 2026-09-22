/**
 * Helper cho trang Thống kê công việc (/dashboard/work-stats):
 * tính key kỳ (tuần/tháng/quý/năm), nhãn hiển thị, danh sách kỳ gần nhất.
 * Dùng chung cách đánh số tuần như getWeekLabel của dự án ("YYYY-Wxx").
 */
export type Gran = "week" | "month" | "quarter" | "year";

export const GRAN_LABEL: Record<Gran, string> = { week: "Tuần", month: "Tháng", quarter: "Quý", year: "Năm" };

/** Số kỳ gần nhất vẽ trong biểu đồ / bảng so sánh */
export const SERIES_LEN: Record<Gran, number> = { week: 12, month: 12, quarter: 8, year: 5 };

export const MODULE_LABEL: Record<string, string> = {
  content: "Nội dung",
  leads: "Khách hàng tiềm năng",
  projects: "Dự án",
  tasks: "Công việc",
  workflow: "Quy trình",
  users: "Tài khoản",
  reports: "Báo cáo",
  settings: "Cài đặt",
  insights: "Gợi ý AI",
  trends: "Xu hướng",
  workreports: "Báo cáo công việc",
  ads: "Chạy quảng cáo",
  social: "Mạng xã hội",
  "social-channels": "Kênh MXH",
  auth: "Đăng nhập",
  profile: "Hồ sơ cá nhân",
  notifications: "Thông báo",
  dailyreports: "Nhật ký công việc",
  chat: "Trò chuyện",
  assistant: "Trợ lý AI",
  utm: "UTM Builder",
  other: "Khác",
};

/** Nhãn hiển thị của 1 kỳ: "Tuần 35/2026", "T9/2026", "Quý 3/2026", "Năm 2026" */
export function periodLabel(key: string, gran: Gran): string {
  if (gran === "week") {
    const [y, w] = key.split("-W");
    return `Tuần ${Number(w)}/${y}`;
  }
  if (gran === "month") {
    const [y, m] = key.split("-");
    return `T${Number(m)}/${y}`;
  }
  if (gran === "quarter") {
    const [y, q] = key.split("-Q");
    return `Quý ${Number(q)}/${y}`;
  }
  return `Năm ${key}`;
}

/** Key của kỳ chứa ngày d (cách đánh số tuần giống getWeekLabel của dự án) */
export function periodKey(d: Date, gran: Gran): string {
  if (gran === "week") {
    const start = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil(((d.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
    return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
  }
  if (gran === "month") return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  if (gran === "quarter") return `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;
  return `${d.getFullYear()}`;
}

/** Danh sách N kỳ gần nhất (kết thúc ở kỳ hiện tại), sắp cũ → mới */
export function recentKeys(gran: Gran, n: number): string[] {
  const keys: string[] = [];
  const cur = new Date();
  for (let i = 0; i < n; i++) {
    keys.push(periodKey(cur, gran));
    if (gran === "week") cur.setDate(cur.getDate() - 7);
    else if (gran === "month") cur.setMonth(cur.getMonth() - 1);
    else if (gran === "quarter") cur.setMonth(cur.getMonth() - 3);
    else cur.setFullYear(cur.getFullYear() - 1);
  }
  return keys.reverse();
}

/** % thay đổi so với kỳ trước; null khi không so được (cả hai = 0) */
export function growth(cur: number, prev: number): number | null {
  if (prev === 0) return cur > 0 ? 100 : null;
  return ((cur - prev) / prev) * 100;
}
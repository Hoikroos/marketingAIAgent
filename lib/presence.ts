/** Tiện ích trạng thái hoạt động (online / "hoạt động X trước") — dùng chung cho API + giao diện chat. */

export const ONLINE_WINDOW_MS = 2 * 60 * 1000; // online nếu hoạt động trong 2 phút gần nhất

export function isOnline(t?: Date | string | null): boolean {
  if (!t) return false;
  return Date.now() - new Date(t).getTime() < ONLINE_WINDOW_MS;
}

export function presenceLabel(t?: Date | string | null, online?: boolean): string {
  if (online || isOnline(t)) return "Đang hoạt động";
  if (!t) return "Chưa hoạt động";
  const diff = Date.now() - new Date(t).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Đang hoạt động";
  if (min < 60) return `Hoạt động ${min} phút trước`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `Hoạt động ${hr} giờ trước`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `Hoạt động ${day} ngày trước`;
  return new Date(t).toLocaleDateString("vi-VN");
}
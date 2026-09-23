import { prisma } from "./prisma";

/**
 * HELPERS THÔNG BÁO — dùng chung cho mọi API route + automation.
 * Mọi notification.create đều được lib/prisma.ts tự đẩy Web Push,
 * nên chỉ cần tạo notification là user nhận push ngay.
 */

/** Đọc cờ bật/tắt loại thông báo trong Cài đặt (vd "notifyContent"). Mặc định bật. */
export async function notifyEnabled(key: string, def = true): Promise<boolean> {
  try {
    const r = await prisma.setting.findUnique({ where: { key } });
    return r ? r.value !== "false" : def;
  } catch {
    return def;
  }
}

/** User đại diện "Hệ thống" — notification ghi cho user này hiển thị cho TẤT CẢ mọi người */
export async function broadcastUserId(): Promise<number> {
  let u = await prisma.user.findUnique({ where: { email: "system@company.vn" } });
  if (!u) {
    u = await prisma.user.create({
      data: { name: "Hệ thống", email: "system@company.vn", role: "Marketing", active: false, permissions: "[]" },
    });
  }
  return u.id;
}

/** Danh sách id các admin/quản lý đang hoạt động */
export async function adminUserIds(): Promise<number[]> {
  const users = await prisma.user.findMany({
    where: { active: true },
    select: { id: true, role: true, permissions: true },
  });
  return users
    .filter((u) => u.role === "Admin" || (() => { try { return (JSON.parse(u.permissions || "[]") || []).includes("*"); } catch { return false; } })())
    .map((u) => u.id);
}

/** Tạo notification an toàn — không bao giờ ném lỗi làm hỏng nghiệp vụ chính */
export async function safeNotify(data: {
  userId: number;
  type: string;
  title: string;
  content?: string;
  link?: string;
  refId?: number;
}): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        content: data.content || "",
        link: data.link || undefined,
        refId: data.refId,
      },
    });
  } catch {}
}

/** Thông báo CHUNG cho cả team (ghi vào user Hệ thống) */
export async function broadcastNotify(data: {
  type: string;
  title: string;
  content?: string;
  link?: string;
  refId?: number;
}): Promise<void> {
  try {
    const uid = await broadcastUserId();
    await safeNotify({ ...data, userId: uid });
  } catch {}
}

/** Thông báo cho TẤT CẢ admin (trừ 1 người nếu cần, vd người thực hiện hành động) */
export async function notifyAdmins(data: {
  type: string;
  title: string;
  content?: string;
  link?: string;
  refId?: number;
  exceptUserId?: number;
}): Promise<void> {
  try {
    const ids = await adminUserIds();
    for (const id of ids) {
      if (data.exceptUserId && id === data.exceptUserId) continue;
      await safeNotify({ ...data, userId: id });
    }
  } catch {}
}

/** Đã tạo notification cùng type + refId trong N phút gần đây? (chống trùng) */
export async function notifiedSince(type: string, refId: number, minutes: number): Promise<boolean> {
  try {
    const since = new Date(Date.now() - minutes * 60_000);
    const n = await prisma.notification.findFirst({
      where: { type, refId, createdAt: { gte: since } },
    });
    return !!n;
  } catch {
    return false;
  }
}

/** Đã tạo notification cùng type + refId HÔM NAY? (chống trùng theo ngày) */
export async function notifiedToday(type: string, refId?: number): Promise<boolean> {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const n = await prisma.notification.findFirst({
      where: { type, ...(refId ? { refId } : {}), createdAt: { gte: start } },
    });
    return !!n;
  } catch {
    return false;
  }
}

/** Đã từng tạo notification cùng type + refId (chống trùng tuyệt đối — vd nội dung viral chỉ báo 1 lần) */
export async function notifiedEver(type: string, refId: number): Promise<boolean> {
  try {
    const n = await prisma.notification.findFirst({ where: { type, refId } });
    return !!n;
  } catch {
    return false;
  }
}

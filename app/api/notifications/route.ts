import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canAccess, isAdminLike } from "@/lib/permissions";

function isAdminUser(user: any) {
  return !!user && (isAdminLike(user) || canAccess(user, "users"));
}

/** User đại diện cho "Hệ thống" — thông báo CHUNG gửi đến user này và hiển thị cho tất cả mọi người */
const BROADCAST_EMAIL = "system@company.vn";
async function getBroadcastUserId() {
  let u = await prisma.user.findUnique({ where: { email: BROADCAST_EMAIL } });
  if (!u) {
    u = await prisma.user.create({
      data: { name: "Hệ thống", email: BROADCAST_EMAIL, role: "Marketing", active: false, permissions: "[]" },
    });
  }
  return u.id;
}

/**
 * GET - danh sách thông báo mà người dùng được xem:
 *  - Thông báo CHUNG (gửi cho user Hệ thống): hiển thị cho TẤT CẢ mọi người.
 *  - Thông báo RIÊNG (userId = xx): chỉ hiển thị cho đúng người đó.
 *  - ADMIN: xem được TẤT CẢ (chung + riêng của mọi người).
 * `unread` = số thông báo CÁ NHÂN của tôi chưa đọc (thông báo chung tính theo từng người ở client).
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401 });
  const me = Number(user.id);
  const admin = isAdminUser(user);
  const broadcastId = await getBroadcastUserId();

  // Admin chỉ xem thông báo chung + thông báo riêng của mình (không xem của nhân viên khác)
  const where = admin ? { OR: [{ userId: me }, { userId: broadcastId }] } : { OR: [{ userId: me }, { userId: broadcastId }] };
  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Đếm số thông báo chưa đọc:
  // - Thông báo riêng: đếm theo read = false
  // - Thông báo chung: đếm tất cả (vì theo dõi đã đọc ở client)
  const personalUnread = notifications.filter((n) => n.userId === me && !n.read).length;
  const generalUnread = notifications.filter((n) => n.userId === broadcastId).length;
  const unread = personalUnread + generalUnread;

  // Thêm flag isGeneral để client phân biệt thông báo chung/thông báo riêng
  const notificationsWithFlag = notifications.map((n) => ({
    ...n,
    isGeneral: n.userId === broadcastId,
  }));

  return NextResponse.json({ ok: true, notifications: notificationsWithFlag, unread, isAdmin: admin });
}

/** POST - Admin gửi thông báo CHUNG hiển thị cho tất cả mọi người (gửi cho user Hệ thống) */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401 });
  if (!isAdminUser(user)) {
    return NextResponse.json({ ok: false, error: "Không có quyền gửi thông báo chung" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const title = String(body?.title || "").trim();
    const note = String(body?.body || "").trim();
    const link = String(body?.link || "").trim();
    const fileName = body?.fileName ? String(body.fileName) : null;
    const filePath = body?.filePath ? String(body.filePath) : null;
    if (!title) return NextResponse.json({ ok: false, error: "Vui lòng nhập tiêu đề" }, { status: 400 });

    const broadcastId = await getBroadcastUserId();
    const created = await prisma.notification.create({
      data: { userId: broadcastId, type: "general", title, content: note || "", link: link || undefined, fileName, filePath },
    });
    return NextResponse.json({ ok: true, notification: created });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401 });

  try {
    const body = await req.json();
    const uid = Number(user.id);

    if (body.all === true) {
      await prisma.notification.updateMany({ where: { userId: uid, read: false }, data: { read: true } });
      return NextResponse.json({ ok: true });
    }

    const id = Number(body.id);
    if (!id) return NextResponse.json({ ok: false, error: "Thiếu id" }, { status: 400 });

    // Chỉ cho đánh dấu đã đọc thông báo RIÊNG của mình (thông báo chung đánh dấu ở client theo từng người)
    await prisma.notification.updateMany({ where: { id, userId: uid }, data: { read: true } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { isOnline } from "@/lib/presence";

/** GET ?with=userId → lịch sử chat với 1 người (từ cũ→mới) + đánh dấu đã đọc */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401 });
  const me = Number(user.id);
  const { searchParams } = new URL(req.url);
  const withId = Number(searchParams.get("with"));
  if (!withId) return NextResponse.json({ ok: false, error: "Thiếu with" }, { status: 400 });

  const messages = await prisma.message.findMany({
    where: { OR: [{ senderId: me, receiverId: withId }, { senderId: withId, receiverId: me }] },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  // Đánh dấu đã đọc các tin người kia gửi cho mình
  await prisma.message.updateMany({ where: { senderId: withId, receiverId: me, read: false }, data: { read: true } });

  // Trạng thái hoạt động của người kia (để hiện "Đang hoạt động" / "hoạt động X trước")
  const other = await prisma.user.findUnique({
    where: { id: withId },
    select: { id: true, name: true, email: true, role: true, avatar: true, lastActiveAt: true },
  });

  return NextResponse.json({
    ok: true,
    messages,
    other: other ? { ...other, online: isOnline(other.lastActiveAt) } : null,
  });
}

/** POST — gửi tin nhắn { receiverId, content } */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401 });
  const me = Number(user.id);
  const body = await req.json();
  const receiverId = Number(body.receiverId);
  const content = String(body.content || "").trim();
  const imageUrl = body.imageUrl ? String(body.imageUrl).trim() : null;
  if (!receiverId || receiverId === me) return NextResponse.json({ ok: false, error: "Người nhận không hợp lệ" }, { status: 400 });
  if (!content && !imageUrl) return NextResponse.json({ ok: false, error: "Nội dung trống" }, { status: 400 });

  const created = await prisma.message.create({
    data: { senderId: me, receiverId, content: content.slice(0, 2000), imageUrl },
  });
  return NextResponse.json({ ok: true, message: created });
}

/** PATCH — thu hồi (recall) / xoá (delete) tin nhắn của chính mình { id, action } */
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401 });
  const me = Number(user.id);
  const body = await req.json();
  const id = Number(body.id);
  const action = body.action;

  const msg = await prisma.message.findUnique({ where: { id } });
  if (!msg) return NextResponse.json({ ok: false, error: "Không tìm thấy tin nhắn" }, { status: 404 });
  if (msg.senderId !== me) return NextResponse.json({ ok: false, error: "Chỉ người gửi mới thu hồi/xoá" }, { status: 403 });

  if (action === "recall") {
    await prisma.message.update({ where: { id }, data: { recalled: true } });
  } else if (action === "delete") {
    await prisma.message.delete({ where: { id } });
  } else {
    return NextResponse.json({ ok: false, error: "action phải là recall hoặc delete" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

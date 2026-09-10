import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401 });
  const me = Number(user.id);
  const groupId = Number(params.id);

  const member = await prisma.groupMember.findUnique({ where: { groupId_userId: { groupId, userId: me } } });
  if (!member) return NextResponse.json({ ok: false, error: "Không phải thành viên nhóm" }, { status: 403 });

  const messages = await prisma.groupMessage.findMany({
    where: { groupId },
    include: { sender: { select: { id: true, name: true, avatar: true } } },
    orderBy: { createdAt: "asc" },
    take: 300,
  });

  // Mở nhóm = đánh dấu đã đọc: cập nhật mốc lastReadAt của tôi trong nhóm này
  await prisma.groupMember
    .update({
      where: { groupId_userId: { groupId, userId: me } },
      data: { lastReadAt: new Date() },
    })
    .catch(() => {});

  // Đếm "đã xem" cho từng tin nhóm: số thành viên KHÁC người gửi có mốc đọc sau thời điểm gửi tin
  const members = await prisma.groupMember.findMany({
    where: { groupId },
    select: { userId: true, lastReadAt: true },
  });
  const out = messages.map((m) => ({
    ...m,
    seenByCount: members.filter(
      (mb) => mb.userId !== m.senderId && !!mb.lastReadAt && m.createdAt.getTime() < mb.lastReadAt.getTime()
    ).length,
  }));

  return NextResponse.json({ ok: true, messages: out });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401 });
  const me = Number(user.id);
  const groupId = Number(params.id);

  const member = await prisma.groupMember.findUnique({ where: { groupId_userId: { groupId, userId: me } } });
  if (!member) return NextResponse.json({ ok: false, error: "Không phải thành viên nhóm" }, { status: 403 });

  const body = await req.json();
  const content = String(body.content || "").trim().slice(0, 2000);
  const imageUrl = body.imageUrl ? String(body.imageUrl).trim() : null;
  if (!content && !imageUrl) return NextResponse.json({ ok: false, error: "Nội dung trống" }, { status: 400 });

  const created = await prisma.groupMessage.create({
    data: { groupId, senderId: me, content, imageUrl },
    include: { sender: { select: { id: true, name: true, avatar: true } } },
  });
  return NextResponse.json({ ok: true, message: created });
}

/** PATCH — thu hồi (recall) / xoá (delete) tin nhắn nhóm của chính mình { id, action } */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401 });
  const me = Number(user.id);
  const groupId = Number(params.id);

  const member = await prisma.groupMember.findUnique({ where: { groupId_userId: { groupId, userId: me } } });
  if (!member) return NextResponse.json({ ok: false, error: "Không phải thành viên nhóm" }, { status: 403 });

  const body = await req.json();
  const id = Number(body.id);
  const action = body.action;

  const msg = await prisma.groupMessage.findUnique({ where: { id } });
  if (!msg || msg.groupId !== groupId) return NextResponse.json({ ok: false, error: "Không tìm thấy tin nhắn" }, { status: 404 });
  if (msg.senderId !== me) return NextResponse.json({ ok: false, error: "Chỉ người gửi mới thu hồi/xoá" }, { status: 403 });

  if (action === "recall") {
    await prisma.groupMessage.update({ where: { id }, data: { recalled: true } });
  } else if (action === "delete") {
    await prisma.groupMessage.delete({ where: { id } });
  } else {
    return NextResponse.json({ ok: false, error: "action phải là recall hoặc delete" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

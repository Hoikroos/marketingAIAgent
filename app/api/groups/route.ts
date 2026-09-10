import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { isOnline } from "@/lib/presence";

const MEMBER_SELECT = { id: true, name: true, email: true, role: true, avatar: true, lastActiveAt: true } as const;

/** GET — danh sách nhóm tôi tham gia (kèm thành viên + tin cuối) */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401 });
  const me = Number(user.id);

  const groups = await prisma.chatGroup.findMany({
    where: { members: { some: { userId: me } } },
    include: {
      members: { include: { user: { select: MEMBER_SELECT } } },
      messages: { orderBy: { createdAt: "desc" }, take: 1, include: { sender: { select: { id: true, name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Mốc "đã đọc" của tôi trong từng nhóm → tính số tin nhóm chưa đọc
  const memberships = await prisma.groupMember.findMany({
    where: { userId: me, groupId: { in: groups.map((g) => g.id) } },
    select: { groupId: true, lastReadAt: true },
  });
  const readByGroup = new Map<number, Date | null>(memberships.map((m) => [m.groupId, m.lastReadAt]));

  const result = await Promise.all(
    groups.map(async (g) => {
      const last = g.messages[0];
      const memberLastRead = readByGroup.get(g.id);
      const unread = await prisma.groupMessage.count({
        where: {
          groupId: g.id,
          senderId: { not: me },
          ...(memberLastRead ? { createdAt: { gt: memberLastRead } } : {}),
        },
      });
      return {
        id: g.id,
        name: g.name,
        createdById: g.createdById,
        members: g.members.map((m) => ({ ...m.user, online: isOnline(m.user.lastActiveAt) })),
        unread,
        lastMessage: last
          ? {
              id: last.id,
              senderId: last.senderId,
              senderName: last.sender?.name || "Thành viên",
              content: last.content,
              imageUrl: last.imageUrl,
              recalled: last.recalled,
              createdAt: last.createdAt,
            }
          : null,
      };
    })
  );

  return NextResponse.json({ ok: true, myId: me, groups: result });
}

/** POST — tạo nhóm { name, memberIds } */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401 });
  const me = Number(user.id);
  const body = await req.json();
  const name = String(body.name || "").trim();
  const memberIds = Array.from(
    new Set((body.memberIds as number[] || []).map((x: number) => Number(x)).filter((n: number) => n > 0 && n !== me))
  );
  if (!name) return NextResponse.json({ ok: false, error: "Nhập tên nhóm" }, { status: 400 });
  if (memberIds.length === 0) return NextResponse.json({ ok: false, error: "Chọn ít nhất 1 thành viên" }, { status: 400 });

  const group = await prisma.chatGroup.create({
    data: {
      name: name.slice(0, 80),
      createdById: me,
      members: { create: [...memberIds, me].map((uid: number) => ({ userId: Number(uid) })) },
    },
  });
  return NextResponse.json({ ok: true, group });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

/** GET — tổng tin nhắn chưa đọc (cá nhân + nhóm) để hiện badge trên icon chat ở header. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401 });
  const me = Number(user.id);

  // Tin nhắn cá nhân chưa đọc
  const dmUnread = await prisma.message.count({ where: { receiverId: me, read: false } });

  // Tin nhóm chưa đọc: tin trong các nhóm tôi tham gia, không phải tôi gửi, mới hơn mốc lastReadAt
  const memberships = await prisma.groupMember.findMany({
    where: { userId: me },
    select: { groupId: true, lastReadAt: true },
  });
  let groupUnread = 0;
  for (const m of memberships) {
    groupUnread += await prisma.groupMessage.count({
      where: {
        groupId: m.groupId,
        senderId: { not: me },
        ...(m.lastReadAt ? { createdAt: { gt: m.lastReadAt } } : {}),
      },
    });
  }

  const unread = dmUnread + groupUnread;
  return NextResponse.json({ ok: true, unread, dmUnread, groupUnread });
}
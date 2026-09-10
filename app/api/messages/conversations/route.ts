import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const ONLINE_WINDOW_MS = 2 * 60 * 1000; // online nếu hoạt động trong 2 phút gần nhất

function onlineOf(t?: Date | string | null): boolean {
  if (!t) return false;
  return Date.now() - new Date(t).getTime() < ONLINE_WINDOW_MS;
}
/** GET — danh sách hội thoại: bạn bè + những người đã từng nhắn (kèm tin cuối + số chưa đọc + trạng thái online) */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401 });
  const me = Number(user.id);

  const [friendships, messages] = await Promise.all([
    prisma.friendship.findMany({
      where: { OR: [{ requesterId: me }, { addresseeId: me }], status: "accepted" },
      include: {
        requester: { select: { id: true, name: true, email: true, role: true, avatar: true, lastActiveAt: true } },
        addressee: { select: { id: true, name: true, email: true, role: true, avatar: true, lastActiveAt: true } },
      },
    }),
    prisma.message.findMany({
      where: { OR: [{ senderId: me }, { receiverId: me }] },
      orderBy: { createdAt: "desc" },
      take: 500,
      include: {
        sender: { select: { id: true, name: true, email: true, role: true, avatar: true, lastActiveAt: true } },
        receiver: { select: { id: true, name: true, email: true, role: true, avatar: true, lastActiveAt: true } },
      },
    }),
  ]);

  const map = new Map<number, { user: { id: number; name: string; email: string; role: string; avatar?: string | null; lastActiveAt?: Date | null }; lastMessage: any | null; unread: number }>();

  for (const f of friendships) {
    const other = f.requesterId === me ? f.addressee : f.requester;
    if (other && !map.has(other.id)) {
      map.set(other.id, { user: other as any, lastMessage: null, unread: 0 });
    }
  }

  for (const m of messages) {
    const other = m.senderId === me ? m.receiver : m.sender;
    if (!other) continue;
    const cur = map.get(other.id) || { user: other as any, lastMessage: null, unread: 0 };
    if (!cur.lastMessage) cur.lastMessage = { id: m.id, content: m.content, senderId: m.senderId, createdAt: m.createdAt, read: m.read, recalled: m.recalled };
    if (m.receiverId === me && !m.read) cur.unread += 1;
    map.set(other.id, cur);
  }

  const conversations = Array.from(map.values())
    .map((c) => ({ ...c, online: onlineOf(c.user.lastActiveAt), lastMessage: c.lastMessage ? { ...c.lastMessage, mine: (c.lastMessage as any).senderId === me } : null }))
    .sort((a, b) => ((b.lastMessage?.createdAt as any) || 0) - ((a.lastMessage?.createdAt as any) || 0));

  return NextResponse.json({ ok: true, conversations, myId: me });
}

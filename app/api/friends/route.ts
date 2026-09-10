import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const USER_SELECT = { id: true, name: true, email: true, role: true, avatar: true } as const;

/** GET — danh sách bạn bè đã kết + lời mời kết bạn (đến & đi) */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401 });
  const me = Number(user.id);

  const [sent, received] = await Promise.all([
    prisma.friendship.findMany({
      where: { requesterId: me },
      include: { addressee: { select: USER_SELECT } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.friendship.findMany({
      where: { addresseeId: me },
      include: { requester: { select: USER_SELECT } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const friends = [
    ...sent.filter((f) => f.status === "accepted").map((f) => ({ id: f.addressee.id, name: f.addressee.name, email: f.addressee.email, role: f.addressee.role, since: f.createdAt })),
    ...received.filter((f) => f.status === "accepted").map((f) => ({ id: f.requester.id, name: f.requester.name, email: f.requester.email, role: f.requester.role, since: f.createdAt })),
  ];

  const incoming = received.filter((f) => f.status === "pending").map((f) => ({ id: f.requester.id, name: f.requester.name, email: f.requester.email, role: f.requester.role }));
  const outgoing = sent.filter((f) => f.status === "pending").map((f) => ({ id: f.addressee.id, name: f.addressee.name, email: f.addressee.email, role: f.addressee.role }));

  return NextResponse.json({ ok: true, friends, incoming, outgoing });
}

/** POST — gửi lời mời kết bạn { friendId } */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401 });
  const me = Number(user.id);
  const body = await req.json();
  const friendId = Number(body.friendId);
  if (!friendId || friendId === me) return NextResponse.json({ ok: false, error: "Không hợp lệ" }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id: friendId } });
  if (!target) return NextResponse.json({ ok: false, error: "Không tìm thấy người dùng" }, { status: 404 });

  const existing = await prisma.friendship.findFirst({
    where: { OR: [{ requesterId: me, addresseeId: friendId }, { requesterId: friendId, addresseeId: me }] },
  });
  if (existing) {
    if (existing.status === "accepted") return NextResponse.json({ ok: false, error: "Đã là bạn bè" }, { status: 400 });
    // Đã gửi hoặc người kia đã gửi → tự chấp nhận nếu họ gửi trước
    if (existing.requesterId === friendId) {
      await prisma.friendship.update({ where: { id: existing.id }, data: { status: "accepted" } });
      return NextResponse.json({ ok: true, message: "Đã kết bạn" });
    }
    return NextResponse.json({ ok: false, error: "Đã gửi lời mời" }, { status: 400 });
  }

  await prisma.friendship.create({ data: { requesterId: me, addresseeId: friendId, status: "pending" } });
  return NextResponse.json({ ok: true, message: "Đã gửi lời mời kết bạn" });
}

/** DELETE — huỷ kết bạn / từ chối lời mời ?friendId= */
export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401 });
  const me = Number(user.id);
  const { searchParams } = new URL(req.url);
  const friendId = Number(searchParams.get("friendId"));

  await prisma.friendship.deleteMany({
    where: { OR: [{ requesterId: me, addresseeId: friendId }, { requesterId: friendId, addresseeId: me }] },
  });
  return NextResponse.json({ ok: true });
}

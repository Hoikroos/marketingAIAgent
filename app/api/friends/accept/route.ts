import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

/** PATCH — chấp nhận lời mời kết bạn { friendId } */
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401 });
  const me = Number(user.id);
  const body = await req.json();
  const friendId = Number(body.friendId);
  if (!friendId) return NextResponse.json({ ok: false, error: "Thiếu friendId" }, { status: 400 });

  const updated = await prisma.friendship.updateMany({
    where: { requesterId: friendId, addresseeId: me, status: "pending" },
    data: { status: "accepted" },
  });
  if (updated.count === 0) return NextResponse.json({ ok: false, error: "Không có lời mời nào" }, { status: 400 });
  return NextResponse.json({ ok: true });
}

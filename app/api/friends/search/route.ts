import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

/** GET ?q= → tìm người dùng để kết bạn (kèm trạng thái quan hệ) */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401 });
  const me = Number(user.id);
  const q = (new URL(req.url).searchParams.get("q") || "").trim().slice(0, 50);
  if (!q) return NextResponse.json({ ok: true, users: [] });

  const users = await prisma.user.findMany({
    where: {
      active: true,
      id: { not: me },
      OR: [{ name: { contains: q } }, { email: { contains: q } }],
    },
    select: { id: true, name: true, email: true, role: true, avatar: true },
    take: 20,
    orderBy: { name: "asc" },
  });

  const ids = users.map((u) => u.id);
  const rels = ids.length
    ? await prisma.friendship.findMany({
        where: { OR: ids.flatMap((fid) => [{ requesterId: me, addresseeId: fid }, { requesterId: fid, addresseeId: me }]) },
        select: { requesterId: true, addresseeId: true, status: true },
      })
    : [];

  const relByUser = new Map<number, "pending" | "incoming" | "accepted">();
  for (const r of rels) {
    const other = r.requesterId === me ? r.addresseeId : r.requesterId;
    relByUser.set(other, r.status === "accepted" ? "accepted" : r.requesterId === me ? "pending" : "incoming");
  }

  return NextResponse.json({
    ok: true,
    users: users.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, relation: relByUser.get(u.id) || "none" })),
  });
}

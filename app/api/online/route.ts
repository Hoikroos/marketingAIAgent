import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

/** POST — heartbeat từ trình duyệt: cập nhật lastActiveAt để hiện online / "hoạt động X phút trước". */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401 });
  await prisma.user.update({ where: { id: Number(user.id) }, data: { lastActiveAt: new Date() } });
  return NextResponse.json({ ok: true });
}
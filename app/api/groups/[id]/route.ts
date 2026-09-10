import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

/** DELETE — giải tán nhóm (chỉ trưởng nhóm). */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401 });
  const me = Number(user.id);
  const groupId = Number(params.id);

  const group = await prisma.chatGroup.findUnique({ where: { id: groupId } });
  if (!group) return NextResponse.json({ ok: false, error: "Không tìm thấy nhóm" }, { status: 404 });
  if (group.createdById !== me) {
    return NextResponse.json({ ok: false, error: "Chỉ trưởng nhóm mới được giải tán nhóm" }, { status: 403 });
  }
  await prisma.chatGroup.delete({ where: { id: groupId } });
  return NextResponse.json({ ok: true });
}

/** POST — rời nhóm (leave) hoặc kích thành viên (kick). */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401 });
  const me = Number(user.id);
  const groupId = Number(params.id);

  const group = await prisma.chatGroup.findUnique({ where: { id: groupId } });
  if (!group) return NextResponse.json({ ok: false, error: "Không tìm thấy nhóm" }, { status: 404 });

  const body = await req.json();
  const action = body.action;

  if (action === "leave") {
    const member = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: me } },
    });
    if (!member) {
      return NextResponse.json({ ok: false, error: "Bạn không phải thành viên nhóm" }, { status: 403 });
    }
    if (group.createdById === me) {
      // Trưởng nhóm rời = giải tán luôn nhóm
      await prisma.chatGroup.delete({ where: { id: groupId } });
      return NextResponse.json({ ok: true, dissolved: true });
    }
    await prisma.groupMember.delete({ where: { groupId_userId: { groupId, userId: me } } });
    return NextResponse.json({ ok: true });
  }

  if (action === "add") {
    if (group.createdById !== me) {
      return NextResponse.json({ ok: false, error: "Chỉ trưởng nhóm mới được thêm thành viên" }, { status: 403 });
    }
    const memberIds = Array.from(
      new Set((body.memberIds as number[] || []).map((x: number) => Number(x)).filter((n: number) => n > 0 && n !== me))
    );
    if (memberIds.length === 0) {
      return NextResponse.json({ ok: false, error: "Chọn ít nhất 1 người" }, { status: 400 });
    }
    const existing = await prisma.groupMember.findMany({
      where: { groupId, userId: { in: memberIds } },
      select: { userId: true },
    });
    const existingIds = new Set(existing.map((e) => e.userId));
    const toAdd = memberIds.filter((id) => !existingIds.has(id));
    if (toAdd.length) {
      await prisma.groupMember.createMany({
        data: toAdd.map((userId) => ({ groupId, userId })),
      });
    }
    return NextResponse.json({ ok: true, added: toAdd.length });
  }

  if (action === "kick") {
    if (group.createdById !== me) {
      return NextResponse.json({ ok: false, error: "Chỉ trưởng nhóm mới được kích thành viên" }, { status: 403 });
    }
    const targetId = Number(body.userId);
    if (!targetId || targetId === me) {
      return NextResponse.json({ ok: false, error: "userId không hợp lệ" }, { status: 400 });
    }
    await prisma.groupMember.delete({ where: { groupId_userId: { groupId, userId: targetId } } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: "action phải là leave, kick hoặc add" }, { status: 400 });
}
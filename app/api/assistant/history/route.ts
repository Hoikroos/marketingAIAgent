import { NextRequest, NextResponse } from "next/server";
import { requirePermApi, getApiUser } from "@/lib/guard";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/assistant/history
 *   ?list=1            → danh sách đoạn chat của tôi + các đoạn chat được chia sẻ
 *   ?sessionId=x       → tin nhắn của 1 đoạn chat (của tôi hoặc được chia sẻ)
 * PATCH { id, shared }  → bật/tắt chia sẻ đoạn chat (chỉ chủ sở hữu)
 * DELETE /api/assistant/history
 *   ?sessionId=x → xoá 1 đoạn chat (chỉ chủ sở hữu)
 *   (không tham số) → xoá TOÀN BỘ lịch sử của tôi
 */
export async function GET(req: NextRequest) {
  const denied = await requirePermApi("assistant");
  if (denied) return denied;
  const user = await getApiUser();
  const uid = Number(user?.id) || 0;

  const url = new URL(req.url);
  const sessionId = Number(url.searchParams.get("sessionId")) || 0;

  if (sessionId) {
    // Xem được nếu là đoạn chat CỦA TÔI hoặc đoạn chat được BẬT chia sẻ
    const conv = await prisma.assistantConversation.findFirst({
      where: { id: sessionId, OR: [{ userId: uid }, { shared: true }] },
    });
    if (!conv) return NextResponse.json({ ok: false, error: "Không tìm thấy đoạn chat" }, { status: 404 });
    const messages = await prisma.assistantMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
      take: 300,
    });
    return NextResponse.json({
      ok: true,
      conversation: conv,
      canManage: conv.userId === uid,
      messages,
    });
  }

  // 1) Đoạn chat của tôi
  const conversations = await prisma.assistantConversation.findMany({
    where: { userId: uid },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });
  // 2) Đoạn chat người khác ĐÃ BẬT chia sẻ (bản thân không lặp lại)
  const shared = await prisma.assistantConversation.findMany({
    where: { shared: true, userId: { not: uid } },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: { id: true, title: true, userName: true, shared: true, updatedAt: true },
  });
  return NextResponse.json({ ok: true, conversations, shared });
}

// PATCH — bật/tắt chia sẻ đoạn chat (chỉ chủ sở hữu)
export async function PATCH(req: NextRequest) {
  const denied = await requirePermApi("assistant");
  if (denied) return denied;
  const user = await getApiUser();
  const uid = Number(user?.id) || 0;
  const body = await req.json().catch(() => ({} as any));
  const id = Number(body?.id);
  if (!id) return NextResponse.json({ ok: false, error: "Thiếu id" }, { status: 400 });

  const conv = await prisma.assistantConversation.findFirst({ where: { id, userId: uid } });
  if (!conv) return NextResponse.json({ ok: false, error: "Chỉ được chia sẻ đoạn chat của mình" }, { status: 403 });

  const shared = body?.shared === undefined ? !conv.shared : !!body.shared;
  const updated = await prisma.assistantConversation.update({ where: { id }, data: { shared } });
  return NextResponse.json({ ok: true, conversation: updated });
}

/**
 * DELETE /api/assistant/history
 *   ?sessionId=x → xoá 1 đoạn chat (chỉ chủ sở hữu)
 *   (không tham số) → xoá TOÀN BỘ lịch sử của tôi
 */
export async function DELETE(req: NextRequest) {
  const denied = await requirePermApi("assistant");
  if (denied) return denied;
  const user = await getApiUser();
  const uid = Number(user?.id) || 0;
  const sessionId = Number(new URL(req.url).searchParams.get("sessionId")) || 0;

  if (sessionId) {
    const conv = await prisma.assistantConversation.findFirst({ where: { id: sessionId, userId: uid } });
    if (!conv) return NextResponse.json({ ok: false, error: "Chỉ được xoá đoạn chat của mình" }, { status: 403 });
    await prisma.assistantMessage.deleteMany({ where: { sessionId } });
    await prisma.assistantConversation.delete({ where: { id: sessionId } });
  } else {
    await prisma.assistantMessage.deleteMany({ where: { userId: uid } });
    await prisma.assistantConversation.deleteMany({ where: { userId: uid } });
  }
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermApi, getApiUser } from "@/lib/guard";
import { isAdminLike } from "@/lib/permissions";

/** GET — sự kiện ngoài của TÔI (admin xem tất cả) */
export async function GET() {
  const user = await getApiUser();
  const uid = Number(user?.id) || 0;
  const admin = !!user && isAdminLike(user);
  const events = await prisma.calendarEvent.findMany({
    where: admin ? {} : { userId: uid },
    orderBy: { eventDate: "asc" },
  });
  return NextResponse.json({ ok: true, events });
}

export async function POST(req: NextRequest) {
  const denied = await requirePermApi("calendar");
  if (denied) return denied;
  const user = await getApiUser();
  const uid = Number(user?.id) || 0;
  try {
    const body = await req.json();
    const title = String(body?.title || "").trim();
    const eventDate = body?.eventDate ? new Date(body.eventDate) : null;
    if (!title || !eventDate || isNaN(eventDate.getTime())) {
      return NextResponse.json({ ok: false, error: "Vui lòng nhập tiêu đề và ngày giờ" }, { status: 400 });
    }
    const created = await prisma.calendarEvent.create({
      data: {
        title: title.slice(0, 200),
        note: body?.note ? String(body.note).slice(0, 500) : null,
        eventDate,
        userId: uid,
        userName: user?.name || null,
      },
    });
    return NextResponse.json({ ok: true, event: created });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const denied = await requirePermApi("calendar");
  if (denied) return denied;
  const user = await getApiUser();
  const uid = Number(user?.id) || 0;
  const admin = !!user && isAdminLike(user);
  try {
    const body = await req.json();
    const id = Number(body?.id);
    if (!id) return NextResponse.json({ ok: false, error: "Thiếu id" }, { status: 400 });
    const existing = await prisma.calendarEvent.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ ok: false, error: "Không tìm thấy sự kiện" }, { status: 404 });
    if (!admin && existing.userId !== uid) {
      return NextResponse.json({ ok: false, error: "Chỉ được sửa sự kiện của mình" }, { status: 403 });
    }
    const data: any = {};
    if (body.title !== undefined) data.title = String(body.title).trim().slice(0, 200) || existing.title;
    if (body.note !== undefined) data.note = body.note ? String(body.note).slice(0, 500) : null;
    if (body.eventDate !== undefined) {
      const d = new Date(body.eventDate);
      if (!isNaN(d.getTime())) data.eventDate = d;
    }
    const updated = await prisma.calendarEvent.update({ where: { id }, data });
    return NextResponse.json({ ok: true, event: updated });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const denied = await requirePermApi("calendar");
  if (denied) return denied;
  const user = await getApiUser();
  const uid = Number(user?.id) || 0;
  const admin = !!user && isAdminLike(user);
  try {
    const id = Number(new URL(req.url).searchParams.get("id"));
    if (!id) return NextResponse.json({ ok: false, error: "Thiếu id" }, { status: 400 });
    const existing = await prisma.calendarEvent.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ ok: false, error: "Không tìm thấy sự kiện" }, { status: 404 });
    if (!admin && existing.userId !== uid) {
      return NextResponse.json({ ok: false, error: "Chỉ được xoá sự kiện của mình" }, { status: 403 });
    }
    await prisma.calendarEvent.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

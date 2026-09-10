import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermApi, getApiUser } from "@/lib/guard";
import { logActivity } from "@/lib/activity";
import { ALL_SOCIAL_CHANNELS } from "@/lib/socialChannels";

// GET - Lấy số liệu mạng xã hội (chỉ xem của mình, Admin xem tất cả)
export async function GET(req: NextRequest) {
  const denied = await requirePermApi("social");
  if (denied) return denied;
  const user = await getApiUser();

  const url = new URL(req.url);
  const platform = url.searchParams.get("platform");
  const week = url.searchParams.get("week");

  const where: any = {};
  if (platform) where.platform = platform;
  if (week) where.weekLabel = week;
  
  // Mọi người có quyền xem MXH đều thấy TẤT CẢ số liệu (không lọc theo owner)

  const metrics = await prisma.socialMetric.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { owner: { select: { id: true, name: true } } },
  });

  return NextResponse.json(metrics);
}

// POST - Nhập số liệu mới
export async function POST(req: NextRequest) {
  const denied = await requirePermApi("social_create");
  if (denied) return denied;
  const user = await getApiUser();

  try {
    const body = await req.json();
    const { platform, channel, followers, views, engagement, leads, weekLabel, note } = body;

    if (!platform || !channel || !weekLabel) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }

    const created = await prisma.socialMetric.create({
      data: {
        platform,
        channel,
        followers: Number(followers) || 0,
        views: Number(views) || 0,
        engagement: Number(engagement) || 0,
        leads: Number(leads) || 0,
        weekLabel,
        note: note || null,
        ownerId: Number(user?.id),
      },
    });

    await logActivity("social", "create", `Nhập số liệu ${platform} - ${channel} (${weekLabel})`);
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// PATCH - Cập nhật số liệu (chỉ sửa của mình)
export async function PATCH(req: NextRequest) {
  const denied = await requirePermApi("social_update");
  if (denied) return denied;
  const user = await getApiUser();

  try {
    const body = await req.json();
    const { id, followers, views, engagement, leads, note } = body;

    if (!id) return NextResponse.json({ error: "Thiếu id" }, { status: 400 });

    // Kiểm tra quyền sở hữu
    const existing = await prisma.socialMetric.findUnique({ where: { id: Number(id) } });
    if (!existing) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
    if (user?.role !== "Admin" && existing.ownerId !== Number(user?.id)) {
      return NextResponse.json({ error: "Không có quyền sửa" }, { status: 403 });
    }

    const data: any = {};
    if (followers !== undefined) data.followers = Number(followers);
    if (views !== undefined) data.views = Number(views);
    if (engagement !== undefined) data.engagement = Number(engagement);
    if (leads !== undefined) data.leads = Number(leads);
    if (note !== undefined) data.note = note;

    const updated = await prisma.socialMetric.update({
      where: { id: Number(id) },
      data,
    });

    await logActivity("social", "update", `Cập nhật số liệu #${id}`);
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// DELETE - Xoá số liệu (chỉ xoá của mình)
export async function DELETE(req: NextRequest) {
  const denied = await requirePermApi("social_delete");
  if (denied) return denied;
  const user = await getApiUser();

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Thiếu id" }, { status: 400 });

  // Kiểm tra quyền sở hữu
  const existing = await prisma.socialMetric.findUnique({ where: { id: Number(id) } });
  if (!existing) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  if (user?.role !== "Admin" && existing.ownerId !== Number(user?.id)) {
    return NextResponse.json({ error: "Không có quyền xoá" }, { status: 403 });
  }

  await prisma.socialMetric.delete({ where: { id: Number(id) } });
  await logActivity("social", "delete", `Xoá số liệu #${id}`);
  return NextResponse.json({ ok: true });
}
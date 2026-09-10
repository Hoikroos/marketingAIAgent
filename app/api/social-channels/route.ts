import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi, requirePermApi } from "@/lib/guard";

// GET - Lấy danh sách kênh (ai có quyền xem Mạng xã hội đều đọc được)
export async function GET() {
  const denied = await requirePermApi("social");
  if (denied) return denied;

  const channels = await prisma.socialChannel.findMany({
    orderBy: [{ platform: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(channels);
}

// POST - Thêm kênh mới
export async function POST(req: NextRequest) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  try {
    const body = await req.json();
    const { platform, name } = body;

    if (!platform || !name) {
      return NextResponse.json({ error: "Thiếu thông tin" }, { status: 400 });
    }

    const existing = await prisma.socialChannel.findFirst({
      where: { platform, name },
    });

    if (existing) {
      return NextResponse.json({ error: "Kênh đã tồn tại" }, { status: 409 });
    }

    const created = await prisma.socialChannel.create({
      data: { platform, name },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// DELETE - Xoá kênh
export async function DELETE(req: NextRequest) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Thiếu id" }, { status: 400 });

  await prisma.socialChannel.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
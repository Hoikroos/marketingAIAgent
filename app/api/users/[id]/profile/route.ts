import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

/** GET — hồ sơ công khai của 1 người dùng để xem profile bạn bè */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401 });
  const id = Number(params.id);
  if (!id) return NextResponse.json({ ok: false, error: "Thiếu id" }, { status: 400 });

  const u = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      jobTitle: true,
      phone: true,
      bio: true,
      socialYoutube: true,
      socialTiktok: true,
      socialFacebook: true,
      socialInstagram: true,
      avatar: true,
    },
  });
  if (!u) return NextResponse.json({ ok: false, error: "Không tìm thấy" }, { status: 404 });
  return NextResponse.json({ ok: true, user: u });
}

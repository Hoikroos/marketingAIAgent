import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { isAdminLike } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";

const TOKEN_TTL_MS = 30 * 60 * 1000; // Mã đặt lại hiệu lực 30 phút

/** Sinh mã đặt lại mật khẩu cho 1 user (chỉ Admin). Trả mã để admin chuyển cho user. */
export async function POST(req: NextRequest) {
  const u = await getCurrentUser();
  if (!u || !isAdminLike(u)) {
    return NextResponse.json({ ok: false, error: "Không có quyền truy cập" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const id = Number(body?.id);
    if (!id) return NextResponse.json({ ok: false, error: "Thiếu id" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true, email: true } });
    if (!user) return NextResponse.json({ ok: false, error: "Không tìm thấy tài khoản" }, { status: 404 });

    // Mã ngẫu nhiên 24 byte, mã hoá base64url → chuỗi an toàn khi dán
    const token = randomBytes(24).toString("base64url");
    await prisma.user.update({
      where: { id },
      data: { resetToken: token, resetTokenExpiry: new Date(Date.now() + TOKEN_TTL_MS) },
    });
    await logActivity("users", "update", `Tạo mã đặt lại mật khẩu cho "${user.name}" (${user.email})`);

    return NextResponse.json({ ok: true, token, expiresInMinutes: 30 });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
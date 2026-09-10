import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { validatePassword } from "@/lib/passwordPolicy";
import { logActivity } from "@/lib/activity";
import { checkLoginRate, recordLoginFailure, getClientIp } from "@/lib/rateLimit";

/**
 * CÔNG KHAI (nằm trong /api/auth): dùng mã đặt lại (do Admin cấp) để tạo mật khẩu mới.
 * Mã là chuỗi ngẫu nhiên 24 byte dùng 1 lần, hết hạn sau 30 phút.
 */
export async function POST(req: NextRequest) {
  // Chống brute-force lên endpoint này (theo IP)
  const ip = getClientIp(req);
  const check = checkLoginRate(ip);
  if (!check.allowed) {
    return NextResponse.json({ ok: false, error: "Quá nhiều lần thử. Vui lòng đợi." }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { email, token, newPassword, confirm } = body;

    if (!email || !token || !newPassword || !confirm || newPassword !== confirm) {
      return NextResponse.json({ ok: false, error: "Vui lòng điền đầy đủ thông tin và xác nhận mật khẩu khớp" }, { status: 400 });
    }
    const pwv = validatePassword(String(newPassword));
    if (!pwv.ok) return NextResponse.json({ ok: false, error: pwv.message }, { status: 400 });

    const mail = String(email).trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: mail } });

    // Luôn trả lỗi chung (không tiết lộ email/mã tồn tại hay không)
    const fail = () =>
      NextResponse.json({ ok: false, error: "Mã đặt lại không hợp lệ hoặc đã hết hạn" }, { status: 400 });

    if (!user || !user.active || !user.resetToken || !user.resetTokenExpiry) {
      recordLoginFailure(ip);
      return fail();
    }
    if (user.resetTokenExpiry.getTime() < Date.now()) {
      recordLoginFailure(ip);
      // Mã hết hạn → xoá cho sạch
      await prisma.user.update({ where: { email: mail }, data: { resetToken: null, resetTokenExpiry: null } });
      return fail();
    }
    // So sánh mã an toàn
    if (!cryptoResp(user.resetToken, String(token))) {
      recordLoginFailure(ip);
      return fail();
    }

    await prisma.user.update({
      where: { email: mail },
      data: {
        passwordHash: hashPassword(String(newPassword)),
        resetToken: null, // dùng 1 lần
        resetTokenExpiry: null,
      },
    });
    await logActivity("users", "update", `Đặt lại mật khẩu tài khoản "${user.name}" (${user.email}) qua mã đặt lại`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

/** So sánh 2 chuỗi an toàn (tránh timing attack) */
function cryptoResp(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { validatePassword } from "@/lib/passwordPolicy";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401 });
  const u = await prisma.user.findUnique({
    where: { id: Number(user.id) },
    select: { id: true, name: true, email: true, phone: true, bio: true, role: true, jobTitle: true, avatar: true, socialYoutube: true, socialTiktok: true, socialFacebook: true, socialInstagram: true },
  });
  return NextResponse.json({ ok: true, user: u });
}

export async function PATCH(req: NextRequest) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401 });
  try {
    const uid = Number(session.id);
    const body = await req.json();

    const data: any = {};
    if (body.name !== undefined && String(body.name).trim()) data.name = String(body.name).trim();
    if (body.phone !== undefined) data.phone = body.phone ? String(body.phone).trim() : null;
    if (body.bio !== undefined) data.bio = body.bio ? String(body.bio).trim() : null;
    if (body.jobTitle !== undefined) data.jobTitle = body.jobTitle ? String(body.jobTitle).trim().slice(0, 100) : null;
    for (const key of ["socialYoutube", "socialTiktok", "socialFacebook", "socialInstagram"]) {
      if (body[key] !== undefined) data[key] = body[key] ? String(body[key]).trim() : null;
    }

    // Đổi email (kiểm tra trùng)
    if (body.email !== undefined && String(body.email).trim()) {
      const mail = String(body.email).trim().toLowerCase();
      const dup = await prisma.user.findFirst({ where: { email: mail, id: { not: uid } } });
      if (dup) return NextResponse.json({ ok: false, error: "Email đã được người khác sử dụng" }, { status: 400 });
      data.email = mail;
    }

    // Đổi mật khẩu: cần mật khẩu hiện tại + mật khẩu mới
    if (body.newPassword) {
      const cur = await prisma.user.findUnique({ where: { id: uid } });
      if (!cur || !cur.passwordHash || !verifyPassword(body.currentPassword || "", cur.passwordHash)) {
        return NextResponse.json({ ok: false, error: "Mật khẩu hiện tại không đúng" }, { status: 400 });
      }
      const pv = validatePassword(String(body.newPassword));
      if (!pv.ok) {
        return NextResponse.json({ ok: false, error: pv.message }, { status: 400 });
      }
      data.passwordHash = hashPassword(String(body.newPassword));
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ ok: false, error: "Không có gì để cập nhật" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: uid },
      data,
      select: { id: true, name: true, email: true, phone: true, bio: true, role: true, jobTitle: true, avatar: true, socialYoutube: true, socialTiktok: true, socialFacebook: true, socialInstagram: true },
    });
    return NextResponse.json({ ok: true, user: updated });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
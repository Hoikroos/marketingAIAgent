import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const ALLOWED = ["png", "jpg", "jpeg", "gif", "webp"];
const MAX_BYTES = 5 * 1024 * 1024;
const AVATAR_DIR = path.join(process.cwd(), "uploads", "avatars");

/** POST — tải ảnh đại diện lên */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401 });
  const me = Number(user.id);

  const form = await req.formData();
  const f = form.get("file");
  if (!(f instanceof File) || f.size === 0) return NextResponse.json({ ok: false, error: "Chưa chọn ảnh" }, { status: 400 });
  const ext = (f.name.split(".").pop() || "").toLowerCase();
  if (!ALLOWED.includes(ext)) return NextResponse.json({ ok: false, error: "Chỉ chấp nhận PNG/JPG/GIF/WEBP" }, { status: 400 });
  if (f.size > MAX_BYTES) return NextResponse.json({ ok: false, error: "Ảnh tối đa 5MB" }, { status: 400 });

  // Xoá avatar cũ (nếu có)
  const cur = await prisma.user.findUnique({ where: { id: me }, select: { avatar: true } });
  if (cur?.avatar) {
    const oldName = cur.avatar.split("/").pop();
    if (oldName) { try { await unlink(path.join(AVATAR_DIR, oldName)); } catch {} }
  }

  await mkdir(AVATAR_DIR, { recursive: true });
  const safe = `avatar_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  await writeFile(path.join(AVATAR_DIR, safe), Buffer.from(await f.arrayBuffer()));
  const url = `/api/files/avatars/${safe}`;

  await prisma.user.update({ where: { id: me }, data: { avatar: url } });
  return NextResponse.json({ ok: true, url });
}

/** DELETE — xoá ảnh đại diện */
export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401 });
  const me = Number(user.id);

  const cur = await prisma.user.findUnique({ where: { id: me }, select: { avatar: true } });
  if (cur?.avatar) {
    const oldName = cur.avatar.split("/").pop();
    if (oldName) { try { await unlink(path.join(AVATAR_DIR, oldName)); } catch {} }
  }
  await prisma.user.update({ where: { id: me }, data: { avatar: null } });
  return NextResponse.json({ ok: true });
}
